import express from 'express';
import { ChatController } from '../controllers/chatController';
import { authMiddleware } from '../middlewares/auth';

const router = express.Router();
const chatController = new ChatController();

router.get(
  '/conversation/:userId1/:userId2',
  authMiddleware,
  chatController.getConversation
);

export default router;