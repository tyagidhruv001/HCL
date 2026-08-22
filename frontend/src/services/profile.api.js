import { request } from './api.js';

export const ProfileAPI = {
  async getProfile() {
    return request('/profile');
  },
  async updateProfile(body) {
    return request('/profile', {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }
};
