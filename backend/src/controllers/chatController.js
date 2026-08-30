import ChatSession from '../models/chatSession.js';
import User from '../models/user.js';
import mlService from '../services/mlService.js';
import { generateTutorResponse } from '../services/aiAdvisorService.js';
import { wantsVideos, searchYouTube } from '../services/youtubeService.js';

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

export const chatController = {
  /**
   * GET /api/chat/session
   * Get or initialize the active chat session for the logged-in user
   */
  async getActiveSession(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      let session = await ChatSession.findOne({ userId }).sort({ updatedAt: -1 });

      const user = await User.findById(userId).select('fname lname email branch goal year skills');
      const fullName = user ? `${user.fname || ''} ${user.lname || ''}`.trim() : 'Learner';
      const goal = user?.goal || user?.branch || 'Software Engineering Mastery';

      if (!session) {
        session = new ChatSession({
          userId,
          title: 'LearnAI Knowledge Engine',
          messages: [
            {
              role: 'ai',
              content: `Hi **${fullName || 'there'}**! 👋 I'm **LearnAI**, your AI Knowledge & Research Engine.\n\nI can research any topic, find YouTube video masterclasses, write and review code, or map your learning path. What would you like to explore today?`,
            },
          ],
        });
        await session.save();
      }

      res.json({ success: true, data: session });
    } catch (error) {
      console.error('getActiveSession error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/chat/message
   * Direct message endpoint with ML Research, YouTube indexing & unconstrained Groq thinking
   */
  async sendDirectMessage(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const { content, sessionId } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, message: 'Message content is required' });
      }

      let session;
      if (sessionId) {
        session = await ChatSession.findOne({ _id: sessionId, userId });
      }
      if (!session) {
        session = await ChatSession.findOne({ userId }).sort({ updatedAt: -1 });
      }
      if (!session) {
        session = new ChatSession({
          userId,
          title: 'LearnAI Knowledge Engine',
          messages: [],
        });
      }

      const user = await User.findById(userId).select('fname lname branch goal year skills');
      const learnerProfile = buildLearnerProfile(user);

      // 1. Add user message
      session.messages.push({ role: 'user', content: content.trim() });

      let aiText = '';
      let videos = [];
      let sources = [];
      let key_points = [];
      let related_questions = [];

      const isVideoRequested = wantsVideos(content);

      // Pre-fetch YouTube videos if explicitly requested
      if (isVideoRequested) {
        try {
          videos = await searchYouTube(content.trim(), 4);
        } catch (ytErr) {
          console.warn('[ChatController] YouTube search error:', ytErr.message);
        }
      }

      // 2. Try ML Microservice /ask (Live Web + YouTube Search + Groq LLM)
      try {
        const mlResult = await mlService.ask(content.trim(), String(userId), learnerProfile);
        if (mlResult?.answer) {
          aiText = mlResult.answer;
          if (isVideoRequested && mlResult.videos && mlResult.videos.length > 0) {
            videos = mlResult.videos;
          } else if (!isVideoRequested) {
            videos = [];
          }
          sources = mlResult.sources || [];
          key_points = mlResult.key_points || [];
          related_questions = mlResult.related_questions || [];
        }
      } catch (mlErr) {
        console.warn('[ChatController] ML /ask error, falling back to direct Groq:', mlErr.message);
      }

      // 3. Fallback to direct Groq / LLM
      if (!aiText) {
        aiText = await generateTutorResponse(content.trim(), session.messages, learnerProfile, videos);
      }

      // 4. Save and return rich response
      const aiMessage = {
        role: 'ai',
        content: aiText,
        createdAt: new Date(),
      };
      session.messages.push(aiMessage);
      await session.save();

      res.json({
        success: true,
        data: {
          ...aiMessage,
          videos,
          sources,
          key_points,
          related_questions,
        },
        sessionId: session._id,
      });
    } catch (error) {
      console.error('sendDirectMessage error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * GET /api/chat/sessions/:sessionId/messages
   */
  async getSessionMessages(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const { sessionId } = req.params;
      const session = await ChatSession.findOne({ _id: sessionId, userId });

      if (!session) {
        return res.status(404).json({ success: false, message: 'Chat session not found' });
      }

      res.json({ success: true, data: session.messages });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/chat/sessions/:sessionId/messages
   */
  async sendMessage(req, res) {
    return chatController.sendDirectMessage(req, res);
  },

  /**
   * DELETE /api/chat/sessions/:sessionId
   */
  async deleteSession(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const { sessionId } = req.params;
      await ChatSession.findOneAndDelete({ _id: sessionId, userId });
      res.json({ success: true, message: 'Session deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

export default chatController;
