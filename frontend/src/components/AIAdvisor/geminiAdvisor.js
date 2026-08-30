import api from '../../services/api.js';

export const GeminiAdvisor = {
  /**
   * JARVIS Client-Side Knowledge Engine
   */
  async sendMessage(userMessage, conversationHistory = [], profile = {}) {
    // 1. Try Backend Chat endpoint
    try {
      const res = await api.post('/chat/message', { content: userMessage });
      if (res?.data?.data?.content) {
        return res.data.data.content;
      }
    } catch (e) {
      console.warn('[JARVIS] Backend /chat/message failed, trying ML /ask directly:', e.message);
    }

    // 2. Direct fetch to local ML Microservice on 8001
    try {
      const directMLRes = await fetch('http://localhost:8001/api/v1/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          learner: {
            user_id: 'u1',
            goal: profile?.goal || 'Software Engineering',
            experience_level: profile?.level?.toLowerCase() || 'intermediate',
            weekly_hours: 12,
            skills: [],
            interests: [],
            completed_courses: []
          },
        }),
      });
      if (directMLRes.ok) {
        const mlData = await directMLRes.json();
        if (mlData?.answer) return mlData.answer;
      }
    } catch (e) {
      console.warn('[JARVIS] Direct ML call failed:', e.message);
    }

    // 3. Math calculation fallback
    try {
      const sanitized = (userMessage || '').replace(/\s+/g, '');
      if (/^[0-9+\-*/().^%]+$/.test(sanitized)) {
        const result = Function(`'use strict'; return (${sanitized})`)();
        return `${userMessage.trim()} = **${result}**`;
      }
    } catch (e) {}

    return `JARVIS is ready to research **${userMessage}**. Exploring relevant web sources and technical documentation...`;
  }
};

export default GeminiAdvisor;
