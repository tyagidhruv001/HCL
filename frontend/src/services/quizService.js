import api from './api';

export const quizService = {
  /**
   * Generate active recall quiz questions for any topic
   */
  async generateQuiz(topic, difficulty = 'beginner', count = 3) {
    const response = await api.post('/quiz/generate', { topic, difficulty, count });
    return response.data;
  },
};

export default quizService;
