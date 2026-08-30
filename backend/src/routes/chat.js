import express from 'express';
import { chatController } from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All AI Advisor chat endpoints require JWT authentication
router.use(protect);

router.get('/session', chatController.getActiveSession);
router.post('/message', chatController.sendDirectMessage);
router.get('/sessions/:sessionId/messages', chatController.getSessionMessages);
router.post('/sessions/:sessionId/messages', chatController.sendMessage);
router.delete('/sessions/:sessionId', chatController.deleteSession);

export default router;
