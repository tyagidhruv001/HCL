import Roadmap from '../models/roadmap.js';
import User from '../models/user.js';
import { generateMultiPhaseRoadmap, generateAIRoadmap, getSubjectColor } from '../services/aiRoadmapService.js';
import { searchYouTube } from '../services/youtubeService.js';

// ──────────────────────────────────────────────────────────────
// @desc   Get the active roadmap for the logged-in user
// @route  GET /api/roadmaps/active
// @access Private
// ──────────────────────────────────────────────────────────────
export const getActiveRoadmap = async (req, res) => {
  try {
    const userId = req.user._id;
    let roadmap = await Roadmap.findOne({ userId, status: 'ACTIVE' }).sort({ createdAt: -1 });

    // Fallback: If none marked ACTIVE, look for latest roadmap
    if (!roadmap) {
      roadmap = await Roadmap.findOne({ userId }).sort({ createdAt: -1 });
    }

    // Auto-generate a default pathway if user has no roadmap yet
    if (!roadmap) {
      const user = await User.findById(userId).select('name branch goal year enrolledCourses');
      const goal = user?.goal || user?.branch || 'Full Stack Engineer';
      const generated = await generateMultiPhaseRoadmap(goal, 'Beginner', {
        name: user?.name,
        branch: user?.branch,
        year: user?.year,
      });

      roadmap = await Roadmap.create({
        userId,
        goal,
        title: generated.title || `${goal} Master Path`,
        description: generated.description || 'Step-by-step adaptive roadmap with structured milestones.',
        totalDuration: generated.totalDuration || '3-4 Months',
        status: 'ACTIVE',
        phases: generated.phases || [],
        completedCourseIds: [],
        bookmarkedCourseIds: [],
      });
    }

    res.json({
      success: true,
      message: 'Active roadmap retrieved',
      data: roadmap,
    });
  } catch (error) {
    console.error('Get Active Roadmap Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Generate (or re-generate) a multi-phase adaptive roadmap
// @route  POST /api/roadmaps/generate
// @access Private
// ──────────────────────────────────────────────────────────────
export const generateRoadmap = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      goal,
      level,
      subjects,
      timeline,
      requirements,
      background,
      learningStyle,
      weeklyHours,
      phaseCount,
      numPhases,
    } = req.body;

    const user = await User.findById(userId).select('name branch goal year enrolledCourses');
    const userGoal = goal || user?.goal || user?.branch || (subjects?.length ? subjects[0] : 'Full Stack Engineer');
    const userLevel = level || 'Beginner';

    // 1. Archive existing active roadmaps
    await Roadmap.updateMany({ userId, status: 'ACTIVE' }, { status: 'ARCHIVED' });

    // 2. Generate multi-phase curriculum via Groq / ML / Gemini AI
    const generated = await generateMultiPhaseRoadmap(userGoal, userLevel, {
      name: user?.name,
      branch: user?.branch,
      year: user?.year,
      timeline: timeline || '3-4 Months',
      requirements: requirements || '',
      background: background || '',
      learningStyle: learningStyle || 'Project-Based & Practical',
      weeklyHours: weeklyHours || '10-15 hrs/week',
      phaseCount: phaseCount || numPhases || 'auto',
    });

    // 3. Save newly generated active roadmap
    const roadmap = await Roadmap.create({
      userId,
      goal: userGoal,
      title: generated.title || `${userGoal} Master Path`,
      description: generated.description || `Tailored ${userLevel}-level curriculum with structured multi-phase milestones.`,
      totalDuration: timeline || generated.totalDuration || '3-4 Months',
      status: 'ACTIVE',
      phases: generated.phases || [],
      completedCourseIds: [],
      bookmarkedCourseIds: [],
      subjects: subjects || user?.enrolledCourses || [],
    });

    res.status(201).json({
      success: true,
      message: 'Roadmap generated successfully',
      data: roadmap,
      aiGenerated: true,
    });
  } catch (error) {
    console.error('Generate Roadmap Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Update course completion progress in active roadmap
// @route  PATCH /api/roadmaps/progress/:courseId
// @route  PUT   /api/roadmaps/progress/:courseId
// @access Private
// ──────────────────────────────────────────────────────────────
export const updateCourseProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;
    const { completed, percent } = req.body;

    const roadmap = await Roadmap.findOne({ userId, status: 'ACTIVE' }).sort({ createdAt: -1 });
    if (!roadmap) {
      return res.status(404).json({ success: false, message: 'No active roadmap found' });
    }

    const isDone = completed !== undefined ? !!completed : percent >= 100;
    let completedList = roadmap.completedCourseIds || [];

    if (isDone) {
      if (!completedList.includes(courseId)) {
        completedList.push(courseId);
      }
    } else {
      completedList = completedList.filter(id => id !== courseId);
    }

    roadmap.completedCourseIds = completedList;
    roadmap.markModified('completedCourseIds');
    await roadmap.save();

    res.json({
      success: true,
      message: 'Progress updated',
      data: {
        completedCourseIds: roadmap.completedCourseIds,
        bookmarkedCourseIds: roadmap.bookmarkedCourseIds,
      },
    });
  } catch (error) {
    console.error('Update Progress Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Toggle bookmark for a course in active roadmap
// @route  PATCH /api/roadmaps/bookmark/:courseId
// @access Private
// ──────────────────────────────────────────────────────────────
export const toggleCourseBookmark = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;

    const roadmap = await Roadmap.findOne({ userId, status: 'ACTIVE' }).sort({ createdAt: -1 });
    if (!roadmap) {
      return res.status(404).json({ success: false, message: 'No active roadmap found' });
    }

    let bookmarkedList = roadmap.bookmarkedCourseIds || [];
    if (bookmarkedList.includes(courseId)) {
      bookmarkedList = bookmarkedList.filter(id => id !== courseId);
    } else {
      bookmarkedList.push(courseId);
    }

    roadmap.bookmarkedCourseIds = bookmarkedList;
    roadmap.markModified('bookmarkedCourseIds');
    await roadmap.save();

    res.json({
      success: true,
      data: {
        bookmarkedCourseIds: roadmap.bookmarkedCourseIds,
      },
    });
  } catch (error) {
    console.error('Toggle Bookmark Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Get user roadmap history
// @route  GET /api/roadmaps
// @access Private
// ──────────────────────────────────────────────────────────────
export const getRoadmapHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const roadmaps = await Roadmap.find({ userId }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: roadmaps,
    });
  } catch (error) {
    console.error('Get Roadmap History Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Legacy node status update (retained for backward compatibility)
// @route  PATCH /api/roadmaps/node/:nodeIndex
// @access Private
// ──────────────────────────────────────────────────────────────
export const updateNodeStatus = async (req, res) => {
  try {
    const { nodeIndex } = req.params;
    const { status } = req.body;
    const idx = parseInt(nodeIndex, 10);

    const roadmap = await Roadmap.findOne({ userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found.' });

    if (roadmap.nodes && roadmap.nodes[idx]) {
      roadmap.nodes[idx].status = status;
      roadmap.markModified('nodes');
      await roadmap.save();
    }

    res.json(roadmap);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Search grounded YouTube video tutorials for a roadmap topic
// @route  GET /api/roadmaps/videos?topic=...
// @access Private
// ──────────────────────────────────────────────────────────────
export const getTopicVideos = async (req, res) => {
  try {
    const topic = req.query.topic || req.query.query || '';
    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, message: 'Topic query is required' });
    }

    const videos = await searchYouTube(topic.trim(), 6);
    res.json({
      success: true,
      topic: topic.trim(),
      count: videos.length,
      data: videos,
    });
  } catch (error) {
    console.error('Get Topic Videos Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

