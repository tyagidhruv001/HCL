import { AI } from './recommendation.js';

export const RecommendationService = {
  async fetchPathRecommendations(profile) {
    return AI.generatePath(profile);
  },
  async getAiResponse(message, history, profile) {
    return AI.sendMessage(message, history, profile);
  }
};
