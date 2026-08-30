import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getActiveRoadmapDAG,
  generateCustomDAG,
  markNodeMastered,
  getSavedGraphs,
  appendNodeToRoadmap
} from '../controllers/competencyController.js';

const router = express.Router();

// Get active roadmap DAG (synced with MongoDB)
router.get('/roadmap', protect, getActiveRoadmapDAG);

// Get user's saved/explored competency graphs from MongoDB
router.get('/saved-graphs', protect, getSavedGraphs);

// Generate or fetch custom competency DAG for any topic from MongoDB
router.post('/generate', protect, generateCustomDAG);

// Mark node as mastered & dynamically unlock downstream dependencies
router.post('/mark-mastered', protect, markNodeMastered);

// Pin/append node to active MongoDB roadmap
router.post('/append-node', protect, appendNodeToRoadmap);

export default router;
