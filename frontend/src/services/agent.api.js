import { api } from './api.js';

export const AgentAPI = {
  executeAction: (data) => api.post('/agent/action', data),
};
