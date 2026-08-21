import { request } from './api.js';

export const MLAPI = {
  async getRecommendation(profile) {
    return request('/recommendation/path', { method: 'POST', body: JSON.stringify(profile) });
  }
};
