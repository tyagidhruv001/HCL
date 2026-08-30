// Example wiring inside your existing Express app.
// e.g. in src/routes/learn.js, then app.use('/api/learn', require('./routes/learn'))

const express = require("express");
const router = express.Router();
const mlService = require("../services/mlService");

// Google-style research answer (NOT a chat reply)
router.post("/ask", async (req, res) => {
  try {
    const { query, learner } = req.body;
    const result = await mlService.ask(query, req.user?.id, learner);
    res.json(result);
  } catch (err) {
    console.error("ask failed:", err.message);
    res.status(502).json({ error: "AI service unavailable, try again." });
  }
});

// Conversational intake -> structured learner profile (saved to your DB after this)
router.post("/profile/extract", async (req, res) => {
  try {
    const { message, existingProfile } = req.body;
    const profile = await mlService.extractProfile(req.user?.id, message, existingProfile);
    // TODO: persist `profile` to your Mongo/Postgres learners collection here
    res.json(profile);
  } catch (err) {
    res.status(502).json({ error: "AI service unavailable, try again." });
  }
});

router.post("/recommendations", async (req, res) => {
  try {
    const { learner, courses } = req.body;
    const result = await mlService.getRecommendations(learner, courses);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: "AI service unavailable, try again." });
  }
});

router.post("/roadmap", async (req, res) => {
  try {
    const { learner, courses } = req.body;
    const result = await mlService.generateRoadmap(learner, courses);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: "AI service unavailable, try again." });
  }
});

module.exports = router;
