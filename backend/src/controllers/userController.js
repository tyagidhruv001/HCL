import User from '../models/user.js';
import Checkpoint from '../models/checkpoint.js';
import Task from '../models/task.js';
import Roadmap from '../models/roadmap.js';
import StudySession from '../models/studySession.js';

// ──────────────────────────────────────────────────────────────
// @desc   Get the logged-in user's profile
// @route  GET /api/users/profile
// @access Private
// ──────────────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    // req.user is attached by protect middleware (no password)
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Update the logged-in user's profile
// @route  PATCH /api/users/profile
// @access Private
// ──────────────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const allowed = [
      'fname', 'lname', 'phone', 'dob', 'education',
      'year', 'interests', 'skills', 'improveSkills', 'about',
      'roll', 'branch', 'sem', 'settings', 'profilePic', 'enrolledCourses'
    ];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Get aggregated analytics for the user
// @route  GET /api/users/analytics
// @access Private
// ──────────────────────────────────────────────────────────────
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Checkpoint history (most recent 8 sessions) 
    const sessions = await Checkpoint.find({ userId })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('subject week score passed feedback createdAt');

    // Reverse so oldest→newest for chart
    const checkpointHistory = sessions.reverse();

    const analyticsData = checkpointHistory.map(s => {
      const d = new Date(s.createdAt);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      return {
        label,
        score: s.score,
        subject: s.subject,
      };
    });

    // Total tasks completed (today & all time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalTasksDone, todayTasksDone, todayTasksTotal] = await Promise.all([
      Task.countDocuments({ userId, done: true }),
      Task.countDocuments({ userId, done: true, date: { $gte: today, $lt: tomorrow } }),
      Task.countDocuments({ userId, date: { $gte: today, $lt: tomorrow } }),
    ]);

    // Consistency Data: Activity (Checkpoint/Task/Focus Session count) per day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [ckptActivity, tskActivity, focusActivity] = await Promise.all([
      Checkpoint.aggregate([
        { $match: { userId, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: { userId, done: true, updatedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, count: { $sum: 1 } } }
      ]),
      StudySession.aggregate([
        { $match: { userId, studiedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$studiedAt" } }, count: { $sum: 1 } } }
      ])
    ]);

    const consistencyData = {};
    ckptActivity.forEach(a => consistencyData[a._id] = (consistencyData[a._id] || 0) + a.count);
    tskActivity.forEach(a => consistencyData[a._id] = (consistencyData[a._id] || 0) + a.count);
    focusActivity.forEach(a => consistencyData[a._id] = (consistencyData[a._id] || 0) + a.count);

    // Active Multi-Phase Roadmap from MongoDB
    let roadmap = await Roadmap.findOne({ userId, status: 'ACTIVE' }).sort({ createdAt: -1 });
    if (!roadmap) {
      roadmap = await Roadmap.findOne({ userId }).sort({ createdAt: -1 });
    }

    let allCourses = [];
    let dynamicProgress = [];
    let dynamicNodes = [];
    let completionPct = 0;

    if (roadmap) {
      const completedSet = new Set(roadmap.completedCourseIds || []);

      if (Array.isArray(roadmap.phases) && roadmap.phases.length > 0) {
        // Multi-phase curriculum structure
        roadmap.phases.forEach((phase, pIdx) => {
          const courses = phase.courses || [];
          const doneInPhase = courses.filter(c => completedSet.has(c.id)).length;
          const pPct = courses.length > 0 ? Math.round((doneInPhase / courses.length) * 100) : 0;

          dynamicProgress.push({
            subject: phase.title || `Phase ${pIdx + 1}`,
            pct: pPct,
            done: doneInPhase,
            total: courses.length,
            color: pPct === 100 ? '#10b981' : pPct > 0 ? '#38bdf8' : '#818cf8',
          });

          courses.forEach((c, cIdx) => {
            const isDone = completedSet.has(c.id);
            allCourses.push({
              id: c.id,
              title: c.title,
              provider: c.provider,
              isDone,
              stepNum: `${pIdx + 1}.${cIdx + 1}`,
              phaseTitle: phase.title,
            });
          });
        });

        const totalCourses = allCourses.length;
        const totalDone = allCourses.filter(c => c.isDone).length;
        completionPct = totalCourses > 0 ? Math.round((totalDone / totalCourses) * 100) : 0;

        // Dynamic nodes for dashboard tasks
        let foundCurrent = false;
        dynamicNodes = allCourses.map((c, i) => {
          let status = 'pending';
          if (c.isDone) {
            status = 'done';
          } else if (!foundCurrent) {
            status = 'current';
            foundCurrent = true;
          }
          return {
            day: `Step ${c.stepNum}`,
            topic: c.title,
            status,
            subject: roadmap.goal || roadmap.title,
            color: c.isDone ? '#10b981' : '#6366f1',
          };
        });
      } else if (Array.isArray(roadmap.progress) && roadmap.progress.length > 0) {
        dynamicProgress = roadmap.progress;
        completionPct = Math.round(roadmap.progress.reduce((a, b) => a + (b.pct || 0), 0) / roadmap.progress.length);
        dynamicNodes = roadmap.nodes || [];
      }
    }

    // Weak topics from low quiz scores or low roadmap completion
    let weakTopics = [];
    if (sessions && sessions.length > 0) {
      weakTopics = sessions
        .filter(s => s.score < 65)
        .map(s => ({
          t: s.subject,
          s: s.score,
          lvl: s.score < 40 ? 'critical' : 'danger',
        }));
    }
    if (weakTopics.length === 0 && dynamicProgress.length > 0) {
      weakTopics = dynamicProgress
        .filter(p => p.pct < 60)
        .map(p => ({
          t: p.subject,
          s: p.pct,
          lvl: p.pct < 40 ? 'critical' : p.pct < 55 ? 'danger' : 'warn',
        }));
    }

    // Dynamic Risk calculation
    const calculatedRisk = completionPct >= 70 ? 'Low' : completionPct >= 30 ? 'Moderate' : 'High';

    // Summary stats
    const avgScore = checkpointHistory.length
      ? Math.round(checkpointHistory.reduce((a, s) => a + s.score, 0) / checkpointHistory.length)
      : 0;

    // Fetch user without password to cleanly expose all dynamic properties
    const user = await User.findById(userId).select('-password');

    res.json({
      user,
      analyticsData,
      checkpointHistory,
      roadmap: roadmap ? {
        ...roadmap.toObject(),
        progress: dynamicProgress,
        nodes: dynamicNodes,
      } : null,
      weakTopics,
      consistencyData,
      stats: {
        avgScore,
        totalTasksDone,
        todayTasksDone,
        todayTasksTotal,
        streak: user.streak || 0,
        riskLevel: user.riskLevel || calculatedRisk,
        completionPct,
      },
    });
  } catch (error) {
    console.error('getAnalytics Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Get leaderboard (top 10 users by checkpoint score)
// @route  GET /api/users/leaderboard
// @access Private
// ──────────────────────────────────────────────────────────────
export const getLeaderboard = async (req, res) => {
  try {
    const leaders = await User.find(
      { checkpointScore: { $gt: 0 } },
      'fname lname checkpointScore streak riskLevel enrolledCourses badges branch sem'
    )
      .sort({ checkpointScore: -1, streak: -1 })
      .limit(10)
      .lean();

    const board = leaders.map((u, i) => ({
      rank: i + 1,
      name: `${u.fname} ${u.lname}`.trim(),
      branch: u.branch || 'CSE',
      sem: u.sem || '',
      score: u.checkpointScore,
      streak: u.streak,
      riskLevel: u.riskLevel,
      badgeCount: (u.badges || []).length,
      subjects: (u.enrolledCourses || []).join(', '),
      isMe: String(u._id) === String(req.user._id),
    }));

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Sync focus score and tab switches
// @route  POST /api/users/sync-focus
// @access Private
// ──────────────────────────────────────────────────────────────
export const syncFocus = async (req, res) => {
  try {
    const { score, switches } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      user.focusScore = score;
      user.totalSwitches = switches;
      await user.save({ validateBeforeSave: false });
      res.json({ message: 'Focus synced', score: user.focusScore, switches: user.totalSwitches });
    } else {
      res.status(404).json({ message: 'User not found.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


