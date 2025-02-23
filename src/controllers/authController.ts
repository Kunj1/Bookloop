import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AppError } from '../utils/AppError';
import { validateRegistration, validateLogin } from '../utils/validator';
import rateLimit from 'express-rate-limit';
import { RequestWithUser } from '../types/express';
import logger from "../utils/logger";
import { fileService } from '../services/fileService';

const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
});

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let profilePictureUrl: string | undefined;
    let profilePicturePublicId: string | undefined;
    
    try {
      const { error } = validateRegistration.validate(req.body);
      if (error) {
        res.status(400).json({
          message: error.details[0].message,
          field: error.details[0].context?.key
        });
        return;
      }

      if (req.file) {
        const uploadResult = await fileService.uploadProfilePicture(req.body.email, req.file);
        profilePictureUrl = uploadResult.url;
        profilePicturePublicId = uploadResult.publicId;
      }

      const user = await authService.register({
        ...req.body,
        profilePicture: profilePictureUrl,
        profilePictureId: profilePicturePublicId
      });

      res.status(201).json({ 
        message: 'User registered successfully', 
        userId: user.id,
        profilePicture: user.profilePicture
      });
    } catch (error: unknown) {
      if (req.file && (error instanceof AppError)) {
        try {
          if (profilePicturePublicId) {
            await fileService.deleteFile(profilePicturePublicId);
          }
        } catch (deleteError) {
          logger.error('Failed to cleanup uploaded file:', deleteError);
        }
      }
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(new AppError('Internal Server Error', 500));
    }
  },

  login: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    loginLimiter(req, res, async (err: any) => {
      if (err) {
        res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
        return;
      }
      try {
        const { error } = validateLogin.validate(req.body);
        if (error) {
          res.status(400).json({
            message: error.details[0].message,
            field: error.details[0].context?.key
          });
          return;
        }
        
        const { email, password } = req.body;
        const result = await authService.login(email, password);
  
        res.status(200).json(result);
      } catch (error: unknown) {
        if (error instanceof AppError) {
          res.status(error.statusCode).json({ message: error.message });
          return;
        }
        logger.error('Unexpected login error:', error);
        res.status(500).json({ message: 'An unexpected error occurred during login' });
      }
    });
  },

  logout: async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      await authService.logout(req.user.id);
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      logger.error('Unexpected logout error:', error);
      res.status(500).json({ message: 'An unexpected error occurred during logout' });
    }
  },

  refreshToken: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ message: 'Refresh token is required' });
        return;
      }
      const newToken = await authService.refreshToken(refreshToken);
      res.json({ token: newToken });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      logger.error('Token refresh failed', error);
      res.status(500).json({ message: 'Token refresh failed' });
    }
  }
};