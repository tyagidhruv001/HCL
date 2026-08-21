import { request } from './api.js';

export const AuthAPI = {
  async login(body) {
    return request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
  },
  async register(body) {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
  }
};
