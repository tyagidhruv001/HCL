import Checkpoint from '../models/checkpoint.js';
import User from '../models/user.js';
import Question from '../models/Question.js';
import { generateAIQuestions, FALLBACK_QUESTIONS } from '../services/aiCheckpointService.js';

// Compute week label (W1, W2...) based on how many sessions the user has done
function computeWeekLabel(count) {
  return `W${count + 1}`;
}

// ──────────────────────────────────────────────────────────────
// @desc   Get 5 AI-generated questions for a checkpoint
// @route  GET /api/checkpoints/:subject
// @access Private
// ──────────────────────────────────────────────────────────────
export const getCheckpointQuestions = async (req, res) => {
  try {
    const { subject } = req.params;

    // Pull user's last score to tune AI difficulty
    const lastSession = await Checkpoint.findOne(
      { userId: req.user._id, subject },
      {},
      { sort: { createdAt: -1 } }
    );
    const lastScore = lastSession?.score ?? null;

    // Generate via AI (with fallback)
    const questions = await generateAIQuestions(subject, 10, { lastScore });

    if (!questions.length) {
      return res.status(404).json({ message: 'No questions found for this subject.' });
    }

    // Return questions with type metadata WITHOUT revealing the answer key
    const safeQuestions = questions.map(({ q, opts, type, difficulty }) => ({
      q,
      opts,
      type: type || 'conceptual',
      difficulty: difficulty || 'medium',
    }));

    res.json({
      subject,
      questions: safeQuestions,
      aiGenerated: true,
      total: safeQuestions.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Submit checkpoint answers and evaluate with ML breakdown
// @route  POST /api/checkpoints/:subject/submit
// @access Private
// ──────────────────────────────────────────────────────────────
export const submitCheckpoint = async (req, res) => {
  try {
    const { subject } = req.params;
    const { answers, questions: clientQuestions } = req.body;

    if (!answers || !clientQuestions) {
      return res.status(400).json({ message: 'answers and questions are required.' });
    }

    // Extract question texts
    const questionTexts = clientQuestions.map(cq => cq.q);

    // Fetch authoritative questions with correct answers and explanations from DB
    const dbQuestions = await Question.find({ q: { $in: questionTexts } });

    // Match client questions against server-authoritative questions and build rich review
    const review = clientQuestions.map((cq, idx) => {
      const dbQ = dbQuestions.find(bq => bq.q === cq.q);
      const correctAns = dbQ ? dbQ.ans : (cq.ans !== undefined ? cq.ans : 0);
      const explanation = dbQ?.explanation || cq.explanation || `The standard verified answer is Option ${String.fromCharCode(65 + correctAns)}.`;
      const qType = cq.type || dbQ?.tags?.[0] || 'conceptual';
      const userAns = answers[idx] !== undefined ? answers[idx] : -1;
      const isCorrect = userAns === correctAns;

      return {
        q: cq.q,
        opts: cq.opts || [],
        userAns,
        correctAns,
        isCorrect,
        type: qType,
        explanation,
      };
    });

    const correct = review.filter(r => r.isCorrect).length;
    const total = review.length || answers.length || 1;
    const pct = Math.round((correct / total) * 100);
    const passed = pct >= 50;
    const feedback = pct >= 80 ? 'optimize' : pct >= 50 ? 'targeted' : 'restructure';

    // Aggregate diagnostic weak areas
    const missedTypes = review.filter(r => !r.isCorrect).map(r => r.type);
    const weakTypeCounts = missedTypes.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});

    // Count prior sessions for week label
    const prior = await Checkpoint.countDocuments({ userId: req.user._id, subject });
    const week = computeWeekLabel(prior);

    const session = await Checkpoint.create({
      userId: req.user._id,
      subject,
      week,
      score: pct,
      answers,
      questions: review.map(r => ({ q: r.q, opts: r.opts, ans: r.correctAns })),
      passed,
      feedback,
    });

    // Update user's overall checkpointScore (running average) and riskLevel
    const allSessions = await Checkpoint.find({ userId: req.user._id });
    const avgScore = allSessions.length > 0
      ? Math.round(allSessions.reduce((a, s) => a + s.score, 0) / allSessions.length)
      : pct;
    const riskLevel = avgScore >= 70 ? 'low' : avgScore >= 50 ? 'medium' : 'high';

    const user = await User.findById(req.user._id);
    if (user) {
      if (!user.badges) user.badges = [];
      if (pct >= 80 && !user.badges.some(b => b.name === 'Top Scorer')) {
        user.badges.push({ icon: '🏆', name: 'Top Scorer', desc: `Scored ${pct}% on ${subject} Checkpoint` });
      }
      user.checkpointScore = avgScore;
      user.riskLevel = riskLevel;
      if (pct >= 70 && !user.skills.includes(subject)) {
        user.skills.push(subject);
      }
      await user.save();
    }

    // Auto-update CompetencyGraph in MongoDB if passed >= 70
    if (pct >= 70) {
      try {
        const CompetencyGraph = (await import('../models/competencyGraph.js')).default;
        const graphs = await CompetencyGraph.find({ userId: req.user._id });
        for (const g of graphs) {
          let changed = false;
          const subjLower = subject.toLowerCase();
          const target = g.nodes.find(n => 
            n.label.toLowerCase() === subjLower || 
            subjLower.includes(n.label.toLowerCase()) || 
            n.label.toLowerCase().includes(subjLower)
          );
          if (target && target.status !== 'mastered') {
            target.status = 'mastered';
            target.masteryScore = pct;
            target.verifiedViaCheckpoint = true;
            changed = true;
          }
          if (changed) {
            const masteredIds = new Set(g.nodes.filter(n => n.status === 'mastered').map(n => n.id));
            g.nodes.forEach(node => {
              if (node.status === 'mastered') return;
              const prereqs = node.prerequisites || [];
              if (prereqs.length === 0 || prereqs.every(p => masteredIds.has(p))) {
                node.status = 'ready';
              } else {
                node.status = 'locked';
              }
            });
            g.masteredNodesCount = g.nodes.filter(n => n.status === 'mastered').length;
            g.readinessPercentage = Math.round((g.masteredNodesCount / g.nodes.length) * 100);
            await g.save();
          }
        }
      } catch (syncErr) {
        console.warn('[Competency Sync] Auto-master error:', syncErr.message);
      }
    }

    res.status(201).json({
      session,
      score: pct,
      correct,
      total,
      passed,
      feedback,
      review,
      analysis: {
        score: pct,
        passed,
        missedTypes: weakTypeCounts,
        recommendation: pct >= 80
          ? `Outstanding comprehension of ${subject}! You are ready to proceed to subsequent advanced milestones.`
          : pct >= 50
          ? `Solid foundation in ${subject}. Focus on clarifying missed questions before starting the next phase.`
          : `Significant knowledge gaps detected in ${subject}. Review core lectures and attempt targeted practice in Focus Studio.`,
      }
    });
  } catch (error) {
    console.error('Submit Checkpoint Fatal Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Get checkpoint history for the user (all subjects)
// @route  GET /api/checkpoints/history
// @access Private
// ──────────────────────────────────────────────────────────────
export const getCheckpointHistory = async (req, res) => {
  try {
    const history = await Checkpoint.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('subject week score passed feedback createdAt');
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
