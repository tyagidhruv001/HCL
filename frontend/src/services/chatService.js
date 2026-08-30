import api from './api.js';

export const chatService = {
  /**
   * Get active AI Advisor chat session
   */
  async getActiveSession() {
    const response = await api.get('/chat/session');
    return response.data;
  },

  /**
   * Get all messages in a session
   */
  async getSessionMessages(sessionId) {
    const response = await api.get(`/chat/sessions/${sessionId}/messages`);
    return response.data;
  },

  /**
   * Send a message to LearnAI Advisor
   */
  async sendMessage(sessionId, content) {
    if (sessionId) {
      try {
        const response = await api.post(`/chat/sessions/${sessionId}/messages`, { content });
        return response.data;
      } catch (err) {
        // Fallback to direct message
      }
    }
    const response = await api.post('/chat/message', { content, sessionId });
    return response.data;
  },

  /**
   * Clear chat session
   */
  async deleteSession(sessionId) {
    const response = await api.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  },
};

export default chatService;
export const ChatAPI = chatService;
