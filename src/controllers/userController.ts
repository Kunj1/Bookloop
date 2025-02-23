import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { AppError } from '../utils/AppError';
import { validateUser, validatePasswordChange } from '../utils/validator';
import { RequestWithUser } from '../types/express';

export const userController = {
  async getCurrentUser(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('User not authenticated', 401));
      }
      const user = await userService.getUserProfile(userId);
      res.json(user);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      }
      next(new AppError('Failed to fetch current user', 500));
    }
  },

  async updateUserProfile(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        next(new AppError('User not authenticated', 401));
      }

      const { error } = validateUser.validate(req.body);
      if (error) {
        next(new AppError(error.details[0].message, 400));
      }

      const updatedUser = await userService.updateUserProfile(userId, req.body, req.file);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      }
      next(new AppError('Failed to update user', 400));
    }
  },

  async updatePassword(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        next( new AppError('User not authenticated', 401));
      }

      const { error } = validatePasswordChange.validate(req.body);
      if (error) {
        next( new AppError(error.details[0].message, 400));
      }

      await userService.updatePassword(userId, req.body.oldPassword, req.body.newPassword);
      res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      if (error instanceof AppError) {
        if (error.message === 'Invalid old password') {
          return next(new AppError('Invalid old password', 401));
        }
        if (error.message === 'New password too similar') {
          return next(new AppError('New password cannot be similar to the old password', 409));
        }
        next(error);
      } else {
        next(new AppError('Failed to update password', 500));
      }
    }
  },

  async deleteUser(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        next( new AppError('User not authenticated', 401));
      }

      await userService.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      }
      next(new AppError('Failed to delete user', 500));
    }
  },
};