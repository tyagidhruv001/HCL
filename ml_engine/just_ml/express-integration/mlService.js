// Drop this into your Express backend, e.g. src/services/mlService.js
// Requires: npm install axios
//
// Set ML_SERVICE_URL in your Express .env, e.g.:
//   ML_SERVICE_URL=http://localhost:8000

const axios = require("axios");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const mlClient = axios.create({
  baseURL: `${ML_SERVICE_URL}/api/v1`,
  timeout: 30000, // LLM calls can take a few seconds — don't let Express time out early
});

async function ask(query, userId, learner) {
  const { data } = await mlClient.post("/ask", { query, user_id: userId, learner });
  return data;
}

async function extractProfile(userId, message, existingProfile) {
  const { data } = await mlClient.post("/profile/extract", {
    user_id: userId,
    message,
    existing_profile: existingProfile || null,
  });
  return data;
}

async function getRecommendations(learner, courses) {
  const { data } = await mlClient.post("/recommendations/generate", {
    learner,
    courses: courses || null, // null -> ML service uses its built-in catalog
  });
  return data;
}

async function generateRoadmap(learner, availableCourses) {
  const { data } = await mlClient.post("/roadmap/generate", {
    learner,
    available_courses: availableCourses || null,
  });
  return data;
}

async function explainRecommendation(learner, course) {
  const { data } = await mlClient.post("/explain", { learner, course });
  return data;
}

module.exports = {
  ask,
  extractProfile,
  getRecommendations,
  generateRoadmap,
  explainRecommendation,
};
