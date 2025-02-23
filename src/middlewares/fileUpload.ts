import { Request, Response, NextFunction } from 'express';
import multer, { Multer } from 'multer';
import { AppError } from '../utils/AppError';
import RateLimit from 'express-rate-limit';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new AppError('Only image files are allowed', 400));
    return;
  }

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = file.originalname.toLowerCase().split('.').pop();
  if (!ext || !allowedExtensions.includes(`.${ext}`)) {
    cb(new AppError('Invalid file extension', 400));
    return;
  }

  cb(null, true);
};

// Create the upload middleware with explicit typing
const upload: Multer = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

// Export the middleware directly
export const uploadMiddleware = upload.single('profilePicture');

export const uploadRateLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 uploads per window
  message: 'Too many uploads from this IP, please try again later'
});