import { request } from './api.js';

export const ProgressAPI = {
  async getProgress() {
    return request('/progress');
  },

  async updateProgress(courseId, progressPercentage) {
    return request(`/progress/${encodeURIComponent(courseId)}`, {
      method: 'PUT',
      body: JSON.stringify({ progressPercentage }),
    });
  },
};
