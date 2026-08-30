import api from './api.js';

export const mlService = {
  /**
   * Check ML Microservice health status
   */
  async getHealth() {
    try {
      const response = await api.get('/ml/health');
      return response.data;
    } catch (e) {
      return { isAlive: false, error: e.message };
    }
  },

  /**
   * Deep Research / Grounded Knowledge search
   * Returns: { answer, key_points, sources, videos, related_questions }
   */
  async ask(query, learner = null) {
    const response = await api.post('/ml/ask', { query, learner });
    return response.data;
  },

  /**
   * Extract structured profile from natural language
   */
  async extractProfile(message, existingProfile = null) {
    const response = await api.post('/ml/profile/extract', { message, existingProfile });
    return response.data;
  },

  /**
   * Generate ML-ranked course recommendations
   */
  async getRecommendations(learner, courses = null) {
    const response = await api.post('/ml/recommendations', { learner, courses });
    return response.data;
  },

  /**
   * Generate ML Phased Roadmap with milestones
   */
  async generateRoadmap(learner, courses = null) {
    const response = await api.post('/ml/roadmap', { learner, courses });
    return response.data;
  },

  /**
   * Explain why a course or milestone was recommended with skill gap quantification
   */
  async explainRecommendation(learner, course) {
    const response = await api.post('/ml/explain', { learner, course });
    return response.data;
  },
};

export default mlService;
