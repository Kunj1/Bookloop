import { Router } from 'express';
import multer from 'multer';
import { bookController } from '../controllers/bookController';
import { authMiddleware } from '../middlewares/auth';
import { uploadRateLimiter } from '../middlewares/fileUpload';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Public routes
router.get('/', bookController.getAllBooks);
router.get('/:id', bookController.getOneBook);

// Protected routes - require authentication
router.use(authMiddleware);

router.post('/',
  uploadRateLimiter,
  upload.array('images', 5), // Allow up to 5 images
  bookController.createBook
);

router.put('/:id',
  uploadRateLimiter,
  upload.array('images', 5),
  bookController.updateBook
);

router.delete('/:id', bookController.deleteBook);
router.post('/:id/mark-sold', bookController.markAsSold);

export default router;