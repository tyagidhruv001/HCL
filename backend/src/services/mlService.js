import dotenv from 'dotenv';
dotenv.config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

async function fetchFromML(endpoint, options = {}) {
  const url = `${ML_SERVICE_URL}/api/v1${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || data.error || `ML Service Error: ${response.status}`);
  }
  return data;
}

export const mlService = {
  /**
   * Health check of the ML Microservice
   */
  async checkHealth() {
    try {
      const data = await fetchFromML('/health');
      return { isAlive: true, data };
    } catch (err) {
      return { isAlive: false, error: err.message };
    }
  },

  /**
   * Google-style Deep Research answer with verified web sources and YouTube tutorials
   */
  async ask(query, userId, learner) {
    return fetchFromML('/ask', {
      method: 'POST',
      body: JSON.stringify({
        query,
        user_id: userId || 'demo-user',
        learner: learner || null,
      }),
    });
  },

  /**
   * Conversational intake to extract structured learner profile
   */
  async extractProfile(userId, message, existingProfile) {
    return fetchFromML('/profile/extract', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId || 'demo-user',
        message,
        existing_profile: existingProfile || null,
      }),
    });
  },

  /**
   * Semantic matching & course recommendations
   */
  async getRecommendations(learner, courses) {
    return fetchFromML('/recommendations/generate', {
      method: 'POST',
      body: JSON.stringify({
        learner,
        courses: courses || null,
      }),
    });
  },

  /**
   * Generate structured multi-phase learning roadmap
   */
  async generateRoadmap(learner, availableCourses) {
    return fetchFromML('/roadmap/generate', {
      method: 'POST',
      body: JSON.stringify({
        learner,
        available_courses: availableCourses || null,
      }),
    });
  },

  /**
   * Explain why a course or milestone was recommended
   */
  async explainRecommendation(learner, course) {
    return fetchFromML('/explain', {
      method: 'POST',
      body: JSON.stringify({
        learner,
        course,
      }),
    });
  },
};

export default mlService;
