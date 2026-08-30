import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  generateRoadmap,
  getActiveRoadmap,
  getRoadmapHistory,
  updateCourseProgress,
  toggleCourseBookmark,
  updateNodeStatus,
  getTopicVideos,
} from '../controllers/roadmapController.js';

const router = express.Router();

// All roadmap routes require authentication
router.get('/active', protect, getActiveRoadmap);
router.get('/videos', protect, getTopicVideos);
router.post('/generate', protect, generateRoadmap);
router.get('/', protect, getRoadmapHistory);
router.patch('/progress/:courseId', protect, updateCourseProgress);
router.put('/progress/:courseId', protect, updateCourseProgress);
router.patch('/bookmark/:courseId', protect, toggleCourseBookmark);
router.patch('/node/:nodeIndex', protect, updateNodeStatus);

export default router;
