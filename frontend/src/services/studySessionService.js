import api from './api';

/**
 * Study Sessions / Focus API Client for Wanderer
 */
const studySessionService = {
  /**
   * Get all logged study sessions for the authenticated user
   */
  async getSessions(limit = 50) {
    const response = await api.get(`/study-sessions?limit=${limit}`);
    return response.data;
  },

  /**
   * Log a new completed study/focus session with exact minutes and seconds
   * @param {number} duration - duration in minutes (e.g. 25, 12.5)
   * @param {string} topic - task or subject name
   * @param {number} durationSeconds - exact duration in seconds (e.g. 1500, 750)
   */
  async logSession(duration, topic, durationSeconds) {
    const response = await api.post('/study-sessions', {
      duration,
      topic,
      durationSeconds,
    });
    return response.data;
  },

  /**
   * Get total study minutes and hours statistics
   */
  async getStats() {
    const response = await api.get('/study-sessions/stats');
    return response.data;
  },

  /**
   * Delete a logged session by ID
   */
  async deleteSession(id) {
    const response = await api.delete(`/study-sessions/${id}`);
    return response.data;
  },
};

export default studySessionService;
