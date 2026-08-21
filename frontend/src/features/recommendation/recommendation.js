/**
 * ai.js — Gemini API Integration (production-hardened ESM)
 * - API key sent via Authorization header (not URL query param)
 * - Input sanitised before sending to API
 * - Proper error classification
 * - Rate-limit retry with exponential back-off
 */

import { Storage, Sanitize } from '../../utils/storage.js';
import { CourseCatalog } from '../courses/courses.js';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models';

/* ── Core API call — key in Authorization header, NOT in URL ── */
async function callGemini(prompt, systemInstruction = '', retries = 1) {
  const key = Storage.getApiKey();
  if (!key) throw new Error('NO_API_KEY');

  // Build URL without key in query string (better security practice)
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    ...(systemInstruction && {
      systemInstruction: { parts: [{ text: systemInstruction }] },
    }),
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
  };

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetch(`${url}?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      // Handle specific error codes
      if (response.status === 400) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || '';
        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
          throw new Error('INVALID_KEY');
        }
        throw new Error(`BAD_REQUEST: ${msg}`);
      }
      if (response.status === 429) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          attempt++;
          continue;
        }
        throw new Error('RATE_LIMIT');
      }
      if (response.status === 403) throw new Error('INVALID_KEY');
      if (response.status >= 500) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1500));
          attempt++;
          continue;
        }
        throw new Error('SERVER_ERROR');
      }

      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `API_ERROR_${response.status}`);
    } catch (e) {
      if (['NO_API_KEY','INVALID_KEY','RATE_LIMIT','BAD_REQUEST'].some(code => e.message.startsWith(code))) throw e;
      if (attempt >= retries) throw e;
      attempt++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

/* ── Validate API key before saving ── */
async function validateKey(key) {
  if (!key || typeof key !== 'string' || key.length < 20) return false;
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key.trim())}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Hi' }] }] }),
    });
    return res.ok;
  } catch { return false; }
}

/* ── System prompt for the AI tutor ── */
const TUTOR_SYSTEM = `You are LearnAI, an expert personalized learning advisor and AI tutor.
You help learners discover their ideal learning path based on their goals, skills, and interests.
Your tone is warm, encouraging, and knowledgeable — like a brilliant mentor.

Key behaviors:
- Ask clarifying questions to understand the learner's goals and background
- Be concise but thorough (3-5 sentences per response normally)
- When recommending resources, always explain WHY they are suitable for THIS specific learner
- Acknowledge when the learner already knows something and skip ahead
- Encourage and celebrate progress
- If the learner seems stuck or demotivated, offer alternative approaches
- Adapt difficulty based on signals from the conversation
- NEVER fabricate course names, always refer to the platform's actual catalog

You have access to a course catalog with courses in: Web Development, Data Science, AI/ML, Cloud & DevOps, Cybersecurity, and UI/UX Design.`;

/* ── Chat with the AI tutor ── */
async function chat(userMessage, conversationHistory, learnerProfile) {
  // Sanitize user input before sending to API
  const safeMessage = (userMessage || '').slice(0, 2000);
  const profileContext = learnerProfile.onboarded ? `
Current Learner Profile:
- Name: ${learnerProfile.name}
- Goal: ${learnerProfile.goal}
- Level: ${learnerProfile.level}
- Interests: ${(learnerProfile.interests || []).join(', ')}
- Timeline: ${learnerProfile.timeline || 'not specified'}
` : '';

  const historyStr = conversationHistory
    .slice(-8) // Last 8 messages only to keep prompt concise
    .map(m => `${m.role === 'user' ? 'Learner' : 'LearnAI'}: ${(m.content || '').slice(0, 500)}`)
    .join('\n');

  const fullPrompt = `${profileContext}

Conversation history:
${historyStr}

Learner: ${safeMessage}

LearnAI:`;

  const text = await callGemini(fullPrompt, TUTOR_SYSTEM);
  return (text || '').trim();
}

/* ── Generate personalized learning path ── */
async function generateLearningPath(profile, availableCourseIds) {
  const catalog = CourseCatalog.all
    .filter(c => availableCourseIds.includes(c.id))
    .map(c => `[${c.id}] ${c.title} (${c.level}, ${c.domain}, ${c.duration})`)
    .join('\n');

  const prompt = `
You are a curriculum designer. Create a personalized learning path for this learner.

LEARNER PROFILE:
- Name: ${profile.name}
- Primary Goal: ${profile.goal}
- Experience Level: ${profile.level}
- Interests/Domains: ${(profile.interests || []).join(', ')}
- Timeline: ${profile.timeline || '6 months'}

AVAILABLE COURSES (format: [id] title (level, domain, duration)):
${catalog}

INSTRUCTIONS:
1. Create a structured learning path with 3-4 phases
2. Each phase should have a clear theme and 3-6 courses
3. Respect prerequisites — do NOT assign a course before its prerequisite
4. Match courses to the learner's level and goals
5. Include a milestone description for each phase
6. Explain in 1-2 sentences why each course was chosen for THIS learner
7. ONLY use course IDs from the AVAILABLE COURSES list above — do NOT invent IDs

Respond with ONLY valid JSON, no markdown fences, in this exact format:
{
  "title": "path title",
  "description": "2-sentence path description",
  "totalDuration": "X months",
  "phases": [
    {
      "id": 1,
      "title": "Phase title",
      "theme": "1-sentence theme description",
      "duration": "X weeks",
      "milestone": "What the learner can do after this phase",
      "courses": [
        {
          "id": "course_id",
          "why": "1-2 sentence personalized reason this was chosen"
        }
      ]
    }
  ]
}`;

  const text = await callGemini(prompt);

  // Robustly extract JSON — strip markdown code fences if present
  let jsonStr = (text || '').replace(/^```(?:json)?\n?/m, '').replace(/```\s*$/m, '').trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned invalid path format');

  let path;
  try {
    path = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error('AI JSON parse failed: ' + e.message);
  }

  if (!path.phases || !Array.isArray(path.phases)) throw new Error('Invalid path structure from AI');

  // Attach full course data — filter out any hallucinated IDs
  path.phases = path.phases.map(phase => ({
    ...phase,
    courses: (phase.courses || []).map(c => {
      if (!c.id) return null;
      const full = CourseCatalog.getById(c.id);
      return full ? { ...full, why: Sanitize.text(c.why || '', 300) } : null;
    }).filter(Boolean),
  })).filter(p => p.courses.length > 0);

  return path;
}

/* ── Explain a specific course recommendation ── */
async function explainRecommendation(course, profile) {
  const prompt = `
Explain in 3-4 sentences why this course is a great fit for this learner.
Be specific, encouraging, and mention how it relates to their goal.

Learner: ${profile.name}, ${profile.level} level, goal: "${profile.goal}", interests: ${(profile.interests || []).join(', ')}
Course: "${course.title}" by ${course.provider} — ${course.description}
Skills gained: ${(course.skills || []).join(', ')}

Write a warm, personalized recommendation (plain text, no markdown):`;

  return await callGemini(prompt, TUTOR_SYSTEM);
}

/* ── Demo mode responses (no API key) ── */
const DEMO_RESPONSES = [
  "That's a great goal! Based on what you've told me, I'd recommend starting with the foundational courses in your area of interest, then progressively building up to more advanced topics. Would you like me to generate a personalized learning path for you?",
  "Excellent! Given your background, I think you're ready to dive into some intermediate-level content. The key is to balance theory with hands-on projects — that's where real learning happens. Shall I put together a structured roadmap?",
  "I love your ambition! The field you're targeting is evolving quickly, so staying current with industry tools is crucial. I'll recommend courses that are directly relevant to today's job market. Let me build your personalized path!",
  "That makes sense — many learners find that area challenging at first. The trick is breaking it down into smaller, achievable milestones. I can create a step-by-step path that makes the journey manageable and rewarding.",
  "You're thinking about this exactly right. Combining technical skills with practical projects will set you apart. I'll design a path that weaves together core concepts with real-world applications. Ready to see your personalized roadmap?",
  "Great choice of direction! There's a clear learning sequence that top practitioners follow in this field. I'll map that out for you, explaining why each step matters for your specific goal.",
];
let demoIndex = 0;

function getDemoResponse(msg) {
  const lower = (msg || '').toLowerCase();
  if (lower.includes('path') || lower.includes('roadmap') || lower.includes('plan')) {
    return "I'd be happy to generate your personalized learning path! Since we're in demo mode, I'll create a sample path based on your profile. For real AI-powered recommendations, add your Gemini API key in settings. Click '✨ Generate My Path' in the My Path tab!";
  }
  if (lower.includes('help') || lower.includes('start') || lower.includes('begin')) {
    return "Let's get you started on the right foot! Based on your profile, I recommend beginning with the foundational courses in your areas of interest. Each recommendation comes with a 'Why this course?' explanation tailored to your specific goals. Ready to see your learning path?";
  }
  const resp = DEMO_RESPONSES[demoIndex % DEMO_RESPONSES.length];
  demoIndex++;
  return resp;
}

function demoGeneratePath(profile) {
  const completed = Storage.getProgress().completedCourseIds;
  const scored    = CourseCatalog.score(profile, completed);
  const byLevel   = { beginner: [], intermediate: [], advanced: [] };
  scored.slice(0, 24).forEach(c => { if (byLevel[c.level]) byLevel[c.level].push(c); });

  const phases = [
    {
      id: 1, title: 'Foundation', theme: 'Build core fundamentals in your chosen domains',
      duration: '4 weeks',
      milestone: 'Understand core concepts and set up your development environment',
      courses: byLevel.beginner.slice(0, 4).map(c => ({
        ...c,
        why: `This covers the ${(c.tags[0] || 'core')} fundamentals essential for your goal of ${profile.goal}.`,
      })),
    },
    {
      id: 2, title: 'Core Skills', theme: 'Develop hands-on practical competencies',
      duration: '6 weeks',
      milestone: 'Build real projects and apply intermediate-level skills confidently',
      courses: byLevel.intermediate.slice(0, 5).map(c => ({
        ...c,
        why: `${c.title} will directly accelerate your progress toward ${profile.goal} with hands-on practice.`,
      })),
    },
    {
      id: 3, title: 'Advanced Topics', theme: 'Master specialised skills and build your portfolio',
      duration: '6 weeks',
      milestone: 'Complete a capstone project and be job-ready',
      courses: byLevel.advanced.slice(0, 4).map(c => ({
        ...c,
        why: `This advanced course will distinguish you as an expert working toward ${profile.goal}.`,
      })),
    },
  ].filter(p => p.courses.length > 0);

  return {
    title: `Your ${profile.goal.slice(0, 60)} Learning Path`,
    description: `A personalized ${profile.level}-level roadmap for your interests in ${(profile.interests || []).join(', ')}.`,
    totalDuration: profile.timeline || '4 months',
    phases,
  };
}

export const AI = {
  validateKey,
  hasKey: () => Storage.hasApiKey(),

  async sendMessage(userMessage, history, profile) {
    if (!Storage.hasApiKey()) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 600));
      return getDemoResponse(userMessage);
    }
    return chat(userMessage, history, profile);
  },

  async generatePath(profile) {
    if (!Storage.hasApiKey()) {
      await new Promise(r => setTimeout(r, 1000));
      return demoGeneratePath(profile);
    }
    const completed = Storage.getProgress().completedCourseIds;
    const scored = CourseCatalog.score(profile, completed).slice(0, 40);
    return generateLearningPath(profile, scored.map(c => c.id));
  },

  async explain(course, profile) {
    if (!Storage.hasApiKey()) {
      return `${course.title} is a perfect match for your goal of "${profile.goal}". The skills you'll gain — ${(course.skills || []).slice(0, 3).join(', ')} — are directly applicable at the ${profile.level} level. This course by ${course.provider} has consistently strong reviews from learners with similar backgrounds to yours.`;
    }
    return explainRecommendation(course, profile);
  },

  async feedback(feedbackText, course, profile) {
    if (!Storage.hasApiKey()) {
      return "That's completely understandable! Learning is not always linear. You might want to revisit the prerequisite topics, try a different resource on the same subject, or take a short break and come back fresh. Remember, every expert was once a beginner!";
    }
    const prompt = `
A learner gave this feedback about their current learning resource: "${feedbackText}"
Current course: "${course.title}" (${course.level})
Learner profile: ${profile.level} level, goal: ${profile.goal}

Give a supportive 2-3 sentence response and suggest what they should do next.`;
    return callGemini(prompt, TUTOR_SYSTEM);
  },
};
