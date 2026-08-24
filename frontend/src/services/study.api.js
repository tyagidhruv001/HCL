import { request } from './api.js';

export const StudyAPI = {
  async getSessions() {
    return request('/study-sessions');
  },

  async logSession(duration) {
    return request('/study-sessions', {
      method: 'POST',
      body: JSON.stringify({ duration }),
    });
  },

  async getStats() {
    return request('/study-sessions/stats');
  },
};
