import { request } from './api.js';

export const RoadmapAPI = {
  async getActiveRoadmap() {
    return request('/roadmaps/active');
  },

  async getUserRoadmaps() {
    return request('/roadmaps');
  },

  async generateRoadmap() {
    return request('/roadmaps/generate', {
      method: 'POST',
    });
  },
};
