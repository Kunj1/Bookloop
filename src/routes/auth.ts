import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middlewares/auth';
import { uploadMiddleware, uploadRateLimiter } from '../middlewares/fileUpload';

const router = Router();

router.post('/register', 
    uploadRateLimiter,
    uploadMiddleware,
    authController.register
  );
router.post('/login', authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.post('/refresh-token', authController.refreshToken);

export default router;