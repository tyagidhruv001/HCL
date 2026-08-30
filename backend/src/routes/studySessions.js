import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getUserSessions,
  logSession,
  getStats,
  deleteSession,
} from '../controllers/studySessionController.js';

const router = express.Router();

router.get('/', protect, getUserSessions);
router.post('/', protect, logSession);
router.get('/stats', protect, getStats);
router.delete('/:id', protect, deleteSession);

export default router;
