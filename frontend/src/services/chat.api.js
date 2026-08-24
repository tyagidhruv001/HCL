import { request } from './api.js';

export const ChatAPI = {
  async getActiveSession() {
    return request('/chat/session');
  },

  async getSessionMessages(sessionId) {
    return request(`/chat/sessions/${sessionId}/messages`);
  },

  async sendMessage(sessionId, content, apiKey = null) {
    return request(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, apiKey }),
    });
  },

  async deleteSession(sessionId) {
    return request(`/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },
};
