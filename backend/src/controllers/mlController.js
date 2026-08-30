import mlService from '../services/mlService.js';
import User from '../models/user.js';

function buildLearnerProfile(user, customLearner = {}) {
  return {
    user_id: String(user?._id || customLearner.user_id || 'u1'),
    goal: String(customLearner.goal || user?.goal || user?.branch || 'Full Stack Software Engineer'),
    experience_level: String(customLearner.experience_level || (user?.year === '1st' ? 'beginner' : user?.year === '2nd' || user?.year === '3rd' ? 'intermediate' : 'advanced')),
    weekly_hours: Number(customLearner.weekly_hours || 12),
    skills: (user?.skills || []).map(s => {
      if (typeof s === 'string') return { name: s, level: 5.0 };
      return { name: s.name || 'Skill', level: Number(s.level || 5.0) };
    }),
    interests: (user?.enrolledCourses && user.enrolledCourses.length > 0) ? user.enrolledCourses : ['Web Development', 'DSA'],
    completed_courses: [],
  };
}

export const mlController = {
  async health(req, res) {
    try {
      const result = await mlService.checkHealth();
      res.json(result);
    } catch (err) {
      res.status(502).json({ isAlive: false, error: err.message });
    }
  },

  async ask(req, res) {
    try {
      const { query, learner } = req.body;
      if (!query || !query.trim()) {
        return res.status(400).json({ error: 'Query is required' });
      }
      const user = req.user ? await User.findById(req.user._id) : null;
      const learnerProfile = buildLearnerProfile(user, learner);
      const result = await mlService.ask(query.trim(), String(req.user?._id || 'u1'), learnerProfile);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('[ML Controller] ask failed:', err.message);
      res.status(502).json({
        success: false,
        error: 'ML Deep Research engine currently unavailable. Please check ML service status.',
      });
    }
  },

  async extractProfile(req, res) {
    try {
      const { message, existingProfile } = req.body;
      const result = await mlService.extractProfile(String(req.user?._id || 'u1'), message, existingProfile);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(502).json({ success: false, error: err.message });
    }
  },

  async recommendations(req, res) {
    try {
      const { learner, courses } = req.body;
      const user = req.user ? await User.findById(req.user._id) : null;
      const learnerProfile = buildLearnerProfile(user, learner);
      const result = await mlService.getRecommendations(learnerProfile, courses);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(502).json({ success: false, error: err.message });
    }
  },

  async roadmap(req, res) {
    try {
      const { learner, courses } = req.body;
      const user = req.user ? await User.findById(req.user._id) : null;
      const learnerProfile = buildLearnerProfile(user, learner);
      const result = await mlService.generateRoadmap(learnerProfile, courses);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(502).json({ success: false, error: err.message });
    }
  },

  async explain(req, res) {
    try {
      const { learner, course } = req.body;
      const user = req.user ? await User.findById(req.user._id) : null;
      const learnerProfile = buildLearnerProfile(user, learner);
      const formattedCourse = {
        id: String(course.id || 'c1'),
        title: String(course.title || 'Course'),
        provider: String(course.provider || 'Coursera'),
        url: String(course.url || 'https://coursera.org'),
        difficulty: String(course.level || 'intermediate'),
        duration_hours: Number(course.duration_hours || 10),
        skills: Array.isArray(course.skills) ? course.skills : ['Programming'],
        prerequisites: [],
        description: String(course.description || course.why || ''),
      };
      const result = await mlService.explainRecommendation(learnerProfile, formattedCourse);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(502).json({ success: false, error: err.message });
    }
  },
};

export default mlController;
