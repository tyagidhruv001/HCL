import { api } from './api.js';

export const QuizAPI = {
  /**
   * Generates a skill assessment quiz for a given topic and difficulty.
   * @param {string} topic - e.g. "React", "Python", "Machine Learning", "SQL"
   * @param {string} difficulty - "beginner" | "intermediate" | "advanced"
   * @param {number} numQuestions - Default 3
   */
  generateQuiz: async (topic, difficulty = 'beginner', numQuestions = 3) => {
    try {
      const res = await api.post('/recommendation/quiz', {
        topic,
        difficulty,
        num_questions: numQuestions
      });
      return res.data;
    } catch (err) {
      console.warn('Backend quiz API unreachable, calling ML service directly:', err.message);
      // Direct ML service fallback
      try {
        const mlRes = await fetch('http://localhost:8088/api/quiz/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, difficulty, num_questions: numQuestions })
        });
        if (mlRes.ok) {
          const data = await mlRes.json();
          return { data };
        }
      } catch (mlErr) {
        console.warn('ML direct quiz failed:', mlErr.message);
      }
      throw err;
    }
  }
};
