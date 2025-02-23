import express from 'express';
import { userController } from '../controllers/userController';
import { authMiddleware } from '../middlewares/auth';
import { uploadMiddleware } from '../middlewares/fileUpload';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/me', userController.getCurrentUser);
router.patch('/me', uploadMiddleware, userController.updateUserProfile);
router.patch('/me/password', userController.updatePassword);
router.delete('/me', userController.deleteUser);

export default router;