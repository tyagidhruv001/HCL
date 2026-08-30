import api from './api.js';

/**
 * Roadmap & My Path Service for Wanderer
 */
const roadmapService = {
  /**
   * Fetch the active multi-phase roadmap for the authenticated user
   */
  async getActiveRoadmap() {
    const response = await api.get('/roadmaps/active');
    return response.data;
  },

  /**
   * Generate (or re-generate) a multi-phase personalized roadmap
   * @param {object|Array} options - { goal, level, timeline, subjects } or array of subjects
   */
  async generateRoadmap(options = {}) {
    const payload = Array.isArray(options) ? { subjects: options } : options;
    const response = await api.post('/roadmaps/generate', payload);
    return response.data;
  },

  /**
   * Update course progress in active roadmap
   */
  async updateProgress(courseId, percent = 100, completed = true) {
    const response = await api.patch(`/roadmaps/progress/${encodeURIComponent(courseId)}`, {
      percent,
      completed,
    });
    return response.data;
  },

  /**
   * Toggle bookmark for a course
   */
  async toggleBookmark(courseId) {
    const response = await api.patch(`/roadmaps/bookmark/${encodeURIComponent(courseId)}`);
    return response.data;
  },

  /**
   * Get roadmap history
   */
  async getRoadmapHistory() {
    const response = await api.get('/roadmaps');
    return response.data;
  },

  /**
   * Get grounded YouTube video lectures for a topic
   */
  async getTopicVideos(topic) {
    const response = await api.get(`/roadmaps/videos?topic=${encodeURIComponent(topic)}`);
    return response.data;
  },

  /**
   * Legacy node status update
   */
  async updateNodeStatus(nodeIndex, status) {
    const response = await api.patch(`/roadmaps/node/${nodeIndex}`, { status });
    return response.data;
  },
};

export default roadmapService;
export const RoadmapAPI = roadmapService;
