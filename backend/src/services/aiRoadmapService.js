import dotenv from 'dotenv';
dotenv.config();
import { generateJSON } from './geminiService.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

/**
 * Generate a multi-phase personalized learning roadmap with AI (Groq -> ML Microservice -> Gemini -> Dynamic Fallback)
 * Works for ANY subject or custom user requirements.
 */
export async function generateMultiPhaseRoadmap(goal = 'Full Stack Engineer', level = 'Beginner', userCtx = {}) {
  const requirements = userCtx.requirements || userCtx.customPrompt || '';
  const background = userCtx.background || userCtx.priorKnowledge || '';
  const learningStyle = userCtx.learningStyle || 'Project-Based & Practical';
  const timeline = userCtx.timeline || '3-4 Months';
  const weeklyHours = userCtx.weeklyHours || '10-15 hrs/week';
  const phaseCount = userCtx.phaseCount || userCtx.numPhases || 'auto';

  let phaseConstraint = 'Adaptively determine the optimal number of phases (between 2 to 6 phases) based on the depth of the subject, user timeline, and requirements. (e.g. A 2-week crash course needs 2 phases; a standard course needs 3-4 phases; an extensive 6-month mastery path needs 4-6 phases).';
  if (phaseCount && phaseCount !== 'auto' && !isNaN(Number(phaseCount))) {
    phaseConstraint = `Generate EXACTLY ${Number(phaseCount)} distinct, progressive phases as requested by the user.`;
  }

  const systemPrompt = `You are JARVIS's Elite Curriculum Architect and AI Education Engine in Wanderer.
You construct comprehensive, structured, multi-phase adaptive learning roadmaps for ANY subject, domain, syllabus, or field of study in the universe (including computer science, data science, quantum physics, robotics, medicine, law, civil services, languages, business, creative arts, and academic exam prep).

You strictly tailor the curriculum to the learner's specific requirements, current background, timeline, and learning style.
Output ONLY a valid JSON object matching the requested schema. Do not include markdown code fences (\`\`\`json).`;

  const userPrompt = `Architect a complete, progressive, multi-phase master learning pathway for the following study objective:

🎯 Learning Goal / Topic: "${goal}"
📊 Starting Level: "${level}"
⏳ Target Timeline: "${timeline}" (Weekly Commitment: ${weeklyHours})
🎨 Learning Style: "${learningStyle}"
🔢 Phase Structure Requirement: ${phaseConstraint}
📝 Specific User Requirements & Objectives: "${requirements || 'Comprehensive end-to-end curriculum from fundamentals to real-world applied mastery'}"
🧠 Learner Background & Prior Knowledge: "${background || 'Starting fresh / standard prerequisites'}"

Return a JSON object with this EXACT structure:
{
  "title": "${goal} Master Pathway",
  "description": "2-3 sentence inspiring pedagogical summary of what this curriculum achieves and how it meets the user's specific requirements.",
  "totalDuration": "${timeline}",
  "phases": [
    {
      "id": 1,
      "phaseNumber": 1,
      "title": "Phase 1: [Descriptive Phase Title]",
      "theme": "Core principles, foundations, and essential setup",
      "duration": "3-4 weeks",
      "milestone": "Concrete hands-on project or verifiable milestone completed at the end of this phase",
      "courses": [
        {
          "id": "step-101",
          "title": "Precise Topic or Course Name",
          "provider": "Platform or Author (e.g. Coursera / YouTube / freeCodeCamp / Official Docs / MIT OCW)",
          "level": "${level}",
          "duration": "10h",
          "rating": 4.9,
          "icon": "Relevant emoji (e.g. 💻, 🧠, ⚡, ⚛️, 🚀, 📚, 🛠️, ☕)",
          "url": "https://www.youtube.com",
          "skills": ["Skill1", "Skill2", "Skill3"],
          "why": "Clear explanation of why this topic is essential and how it directly addresses the learner's goals."
        }
      ]
    }
  ]
}

Curriculum Design Rules:
1. ${phaseConstraint}
2. Each phase MUST contain 2 to 3 high-value, actionable course/topic steps.
3. Every step MUST have concrete 'skills', a descriptive 'why', and realistic 'duration'.
4. Ensure the milestones and steps reflect the user's exact requirements and chosen learning style.
5. Return ONLY pure JSON.`;

  // 1. PRIMARY ENGINE: Groq High-Speed LLM (JSON Mode)
  if (GROQ_API_KEY) {
    try {
      console.log(`[AI Roadmap Service] Requesting Groq LLM curriculum for "${goal}"...`);
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        }),
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const content = groqData?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed?.phases?.length > 0) {
            console.log(`[AI Roadmap Service] SUCCESS (Groq): Generated ${parsed.phases.length} phases for "${goal}"`);
            return normalizeRoadmapData(parsed, goal, timeline);
          }
        }
      }
    } catch (groqErr) {
      console.warn('[AI Roadmap Service] Groq generation error, falling back to ML service:', groqErr.message);
    }
  }

  // 2. SECONDARY ENGINE: ML Microservice on port 8001
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/api/v1/roadmap/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learner: {
          goal,
          experience_level: level.toLowerCase(),
          requirements,
          background,
          learning_style: learningStyle,
        },
        available_courses: []
      })
    });

    if (mlRes.ok) {
      const mlData = await mlRes.json();
      if (mlData?.phases?.length > 0) {
        console.log(`[AI Roadmap Service] SUCCESS (ML Microservice): Generated roadmap for "${goal}"`);
        return normalizeRoadmapData(mlData, goal, timeline);
      }
    }
  } catch (mlErr) {
    console.warn('[AI Roadmap Service] ML Microservice error:', mlErr.message);
  }

  // 3. TERTIARY ENGINE: Google Gemini 2.5 Flash
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log(`[AI Roadmap Service] Requesting Gemini for "${goal}"...`);
      const geminiData = await generateJSON(`${systemPrompt}\n\n${userPrompt}`);
      if (geminiData?.phases?.length > 0) {
        console.log(`[AI Roadmap Service] SUCCESS (Gemini): Generated roadmap for "${goal}"`);
        return normalizeRoadmapData(geminiData, goal, timeline);
      }
    } catch (geminiErr) {
      console.warn('[AI Roadmap Service] Gemini generation error:', geminiErr.message);
    }
  }

  // 4. FINAL FALLBACK: Dynamic Algorithmic Builder
  console.log(`[AI Roadmap Service] Generating dynamic algorithmic pathway for "${goal}"`);
  return buildDynamicFallbackRoadmap(goal, level, timeline, requirements);
}

/**
 * Normalizes and verifies roadmap schema consistency
 */
function normalizeRoadmapData(data, goal, timeline) {
  const phases = (data.phases || []).map((phase, pIdx) => ({
    id: phase.id || pIdx + 1,
    phaseNumber: phase.phaseNumber || pIdx + 1,
    title: phase.title || `Phase ${pIdx + 1}: Foundations of ${goal}`,
    theme: phase.theme || `Core concepts and applied techniques for ${goal}`,
    duration: phase.duration || '4 weeks',
    milestone: phase.milestone || `Complete hands-on milestone project for Phase ${pIdx + 1}`,
    courses: (phase.courses || []).map((course, cIdx) => ({
      id: course.id || `step-${pIdx + 1}-${cIdx + 1}-${Date.now()}`,
      title: course.title || `Topic ${pIdx + 1}.${cIdx + 1}`,
      provider: course.provider || 'Wanderer Academy',
      level: course.level || 'Beginner',
      duration: course.duration || '8h',
      rating: course.rating || 4.9,
      icon: course.icon || '📖',
      url: course.url && course.url !== '#' ? course.url : `https://www.youtube.com/results?search_query=${encodeURIComponent(course.title || goal)}`,
      skills: Array.isArray(course.skills) && course.skills.length > 0 ? course.skills : [goal, 'Problem Solving', 'Implementation'],
      why: course.why || `Essential stepping stone for mastering ${goal}.`,
      completed: false,
    }))
  }));

  return {
    title: data.title || `${goal} Master Pathway`,
    description: data.description || `Customized curriculum engineered to take you to production-ready mastery in ${goal}.`,
    totalDuration: data.totalDuration || timeline || '3-4 Months',
    phases,
  };
}

/**
 * Dynamic fallback if all network LLM endpoints fail
 */
function buildDynamicFallbackRoadmap(goal, level, timeline, requirements) {
  const cleanGoal = goal.replace(/mastery|roadmap|pathway/gi, '').trim() || 'General Studies';
  return {
    title: `${cleanGoal} Mastery Pathway`,
    description: `A customized ${level}-level curriculum structured to guide you through ${cleanGoal} fundamentals, practical applications, and advanced projects.`,
    totalDuration: timeline || '3-4 Months',
    phases: [
      {
        id: 1,
        phaseNumber: 1,
        title: `Phase 1: Foundations & Core Principles of ${cleanGoal}`,
        theme: `Establish fundamental syntax, key principles, and conceptual mental models for ${cleanGoal}`,
        duration: '3 weeks',
        milestone: `Construct a working foundational baseline application or solve core exercises in ${cleanGoal}.`,
        courses: [
          {
            id: 'dyn-step-101',
            title: `Core Fundamentals & Essentials of ${cleanGoal}`,
            provider: 'freeCodeCamp / Official Docs',
            level: level || 'Beginner',
            duration: '10h',
            rating: 4.9,
            icon: '⚡',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanGoal + ' tutorial fundamentals')}`,
            skills: [`${cleanGoal} Syntax`, 'Core Concepts', 'Tooling Setup'],
            why: `Builds the non-negotiable mental foundation before diving into advanced patterns in ${cleanGoal}.`
          },
          {
            id: 'dyn-step-102',
            title: `Hands-On Practice & Problem Solving in ${cleanGoal}`,
            provider: 'Coursera / Open Source',
            level: level || 'Beginner',
            duration: '12h',
            rating: 4.8,
            icon: '💻',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanGoal + ' practice exercises')}`,
            skills: ['Debugging', 'Problem Solving', 'Best Practices'],
            why: `Solidifies understanding through interactive problem solving and practical exercises.`
          }
        ]
      },
      {
        id: 2,
        phaseNumber: 2,
        title: `Phase 2: Applied Systems & Architecture in ${cleanGoal}`,
        theme: `Intermediate techniques, design patterns, and real-world system integrations`,
        duration: '5 weeks',
        milestone: `Build and deploy a full functional module applying ${cleanGoal} design patterns.`,
        courses: [
          {
            id: 'dyn-step-201',
            title: `Architecture, Frameworks & Advanced Patterns in ${cleanGoal}`,
            provider: 'Udemy / DeepLearning.AI',
            level: 'Intermediate',
            duration: '16h',
            rating: 4.9,
            icon: '🧠',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanGoal + ' architecture patterns')}`,
            skills: ['System Design', 'Design Patterns', 'Scalability'],
            why: `Teaches industry-standard techniques to design maintainable, high-performance systems.`
          }
        ]
      },
      {
        id: 3,
        phaseNumber: 3,
        title: `Phase 3: Production Capstone & Specialization in ${cleanGoal}`,
        theme: `End-to-end capstone, production deployment, optimization, and portfolio showcase`,
        duration: '4 weeks',
        milestone: `Publish an end-to-end production capstone demonstrating full mastery of ${cleanGoal}.`,
        courses: [
          {
            id: 'dyn-step-301',
            title: `${cleanGoal} Real-World Production Capstone Project`,
            provider: 'GitHub / Industry Showcase',
            level: 'Advanced',
            duration: '20h',
            rating: 4.9,
            icon: '🚀',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanGoal + ' project tutorial')}`,
            skills: ['End-to-End Development', 'Optimization', 'Production Deployment'],
            why: `Proves your ability to take complex requirements and deliver robust solutions independently.`
          }
        ]
      }
    ]
  };
}

// ── Legacy Subject Colors & Checkpoint Generator ────────────────────
const SUBJECT_COLORS = {
  DSA:        '#00d4aa',
  OS:         '#ef4444',
  DBMS:       '#f59e0b',
  CN:         '#a855f7',
  Algorithms: '#6366f1',
};

export async function generateAIRoadmap(subject, userCtx = {}) {
  const color = SUBJECT_COLORS[subject] || '#00d4aa';
  return {
    nodes: [
      { day: 'Day 1–3', topic: `Fundamentals of ${subject}`, status: 'current', color, subject },
      { day: 'Day 4–7', topic: `Core Architecture of ${subject}`, status: 'pending', color, subject },
      { day: 'Day 8–12', topic: `Applied Problem Solving in ${subject}`, status: 'pending', color, subject },
      { day: 'Day 13–15', topic: `Checkpoint Test 🎯`, status: 'pending', color, subject },
    ],
    color,
  };
}

export function getSubjectColor(subject) {
  return SUBJECT_COLORS[subject] || '#00d4aa';
}

export default { generateMultiPhaseRoadmap, generateAIRoadmap, getSubjectColor };
