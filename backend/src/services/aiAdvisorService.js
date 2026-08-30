import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const JARVIS_SYSTEM = `You are JARVIS, an ultra-intelligent, unrestricted AI Knowledge Browser and Research Engine in Wanderer.
You have vast, multi-disciplinary expertise spanning software engineering, quantum physics, world leaders, business, mathematics, computer science, space exploration, and human knowledge.

Key behaviors:
- Answer ANY query (scientific, historical, technical, mathematical, biographical, or conceptual) thoroughly and authoritatively.
- When asked about people (e.g. Elon Musk, Sundar Pichai), provide their real achievements, background, current ventures, and impact.
- For math questions (e.g. 4+5), calculate and output the exact answer directly.
- Include structured headings, key takeaways, and clean code examples where relevant.
- Do NOT restrict yourself to any narrow domain or website topic — you are free to think, analyze, and research everything.
- The learner profile (if any) is ONLY for calibrating tone, vocabulary, and depth. NEVER force an unrelated question into a coding or DSA context unless explicitly asked, and do not editorialize about whether a query fits the platform.
- When the user asks for YouTube videos, video tutorials, or links to watch, directly recommend the best videos and include direct markdown links [Title](url) so the user can open them. NEVER say "As an AI, I cannot directly play or embed video files" — provide the direct video links objectively.`;

export async function generateTutorResponse(userMessage, conversationHistory = [], userProfile = {}, videos = [], effectiveTopic = '') {
  const profileContext = userProfile?.name
    ? `User: ${userProfile.name}, Goal: "${userProfile.goal || userProfile.branch || 'Software Engineering'}"`
    : '';

  const topicContext = (effectiveTopic && effectiveTopic.toLowerCase() !== userMessage.toLowerCase())
    ? `\nTopic Context: The user is requesting video tutorials/links regarding the discussion topic: "${effectiveTopic}".`
    : '';

  let videoContext = '';
  if (videos && videos.length > 0) {
    const topicLabel = effectiveTopic || userMessage;
    videoContext = `\n\n--- Verified YouTube Videos for "${topicLabel}" ---\n${videos.map(v => `- [${v.title} (${v.channel})](${v.url})`).join('\n')}\n(Recommend and link these videos for "${topicLabel}")`;
  }

  const messages = [
    { role: 'system', content: `${JARVIS_SYSTEM}${profileContext ? `\n\nContext:\n${profileContext}` : ''}${topicContext}` }
  ];

  (conversationHistory || []).slice(-6).forEach(m => {
    messages.push({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: (m.content || '').slice(0, 1000)
    });
  });

  messages.push({ role: 'user', content: `${userMessage}${videoContext}` });

  // 1. PRIMARY: Groq High-Speed LLM
  if (GROQ_API_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: messages,
          temperature: 0.5,
          max_tokens: 2048,
        }),
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const text = groqData?.choices?.[0]?.message?.content;
        if (text && text.trim()) return text.trim();
      }
    } catch (groqErr) {
      console.warn('Groq connection error:', groqErr.message);
    }
  }

  // 2. ML Microservice on port 8001 (/ask)
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/api/v1/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: userMessage,
        learner: userProfile ? {
          goal: userProfile.goal || 'Software Engineering',
          experience_level: userProfile.level?.toLowerCase() || 'intermediate',
        } : null,
      }),
    });

    if (mlRes.ok) {
      const mlData = await mlRes.json();
      if (mlData?.answer && mlData.answer.trim()) {
        return mlData.answer.trim();
      }
    }
  } catch (mlErr) {
    console.warn('ML Microservice error:', mlErr.message);
  }

  // 3. Fallback: Google Gemini 2.5 Flash
  if (GEMINI_API_KEY) {
    try {
      const prompt = `${profileContext ? `Context:\n${profileContext}\n\n` : ''}${videoContext ? `Context:\n${videoContext}\n\n` : ''}User: ${userMessage}\nJARVIS:`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY.trim())}`;
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: JARVIS_SYSTEM }] },
          generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
        }),
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) return text.trim();
      }
    } catch (geminiErr) {
      console.warn('Gemini fallback error:', geminiErr.message);
    }
  }

  // 4. Deterministic Math check
  try {
    const sanitizedMath = userMessage.replace(/\s+/g, '');
    if (/^[0-9+\-*/().^%]+$/.test(sanitizedMath)) {
      const calculated = Function(`'use strict'; return (${sanitizedMath})`)();
      return `${userMessage.trim()} = **${calculated}**`;
    }
  } catch (e) {}

  // 5. If video query fallback with found videos
  if (videos && videos.length > 0) {
    return `Here are the top video tutorials for **${userMessage}**:\n\n` +
      videos.map((v, i) => `${i + 1}. [**${v.title}**](${v.url}) — *${v.channel}*`).join('\n\n');
  }

  return `I am analyzing "${userMessage}". What specific aspects would you like JARVIS to research in detail?`;
}

export default {
  generateTutorResponse,
};
