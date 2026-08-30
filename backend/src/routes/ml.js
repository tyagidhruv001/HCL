import express from 'express';
import { mlController } from '../controllers/mlController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public / open health check
router.get('/health', mlController.health);

// Authenticated ML endpoints
router.use(protect);
router.post('/ask', mlController.ask);
router.post('/profile/extract', mlController.extractProfile);
router.post('/recommendations', mlController.recommendations);
router.post('/roadmap', mlController.roadmap);
router.post('/explain', mlController.explain);

export default router;
