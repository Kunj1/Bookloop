import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import { AppError } from '../utils/AppError';
import { notificationService } from './notificationService';
import { fileService } from './fileService';
import logger from '../utils/logger';

const userRepository = AppDataSource.getRepository(User);

export const userService = {
  async updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid old password', 401);
    }

    if (oldPassword === newPassword) {
      throw new AppError('New password cannot be the same as the old password', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await userRepository.save(user);

    // Send password update notification
    try {
      await notificationService.sendNotification({
        type: 'email',
        recipient: user.email,
        template: 'password_update',
        data: {
          name: user.fullName,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to send password update email:', error);
    }
  },

  async getUserProfile(userId: string): Promise<Partial<User>> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user.toJSON();
  },

  async updateUserProfile(
    userId: string,
    profileData: Partial<User>,
    profilePictureFile?: Express.Multer.File
  ): Promise<Partial<User>> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Remove non-updatable fields
    const { 
      id, email, role, refreshToken, password,
      ...updatableFields 
    } = profileData;

    const originalProfilePictureId = user.profilePictureId;

    // Handle profile picture upload
    if (profilePictureFile) {
      try {
        const uploadResult = await fileService.uploadProfilePicture(user.email, profilePictureFile);
        updatableFields.profilePicture = uploadResult.url;
        updatableFields.profilePictureId = uploadResult.publicId;

        // Delete old profile picture if exists
        if (originalProfilePictureId) {
          try {
            await fileService.deleteProfilePicture(originalProfilePictureId);
          } catch (deleteError) {
            logger.error('Failed to delete old profile picture:', deleteError);
          }
        }
      } catch (uploadError) {
        logger.error('Failed to upload profile picture:', uploadError);
        throw new AppError('Failed to upload profile picture', 500);
      }
    }

    // Validate phone number if it's being updated
    if (updatableFields.phoneNumber) {
      const existingPhone = await userRepository.findOne({ 
        where: { phoneNumber: updatableFields.phoneNumber }
      });
      if (existingPhone && existingPhone.id !== userId) {
        throw new AppError('Phone number already in use', 400);
      }
    }
    
    userRepository.merge(user, updatableFields);
    await userRepository.save(user);

    // Send profile update notification
    try {
      await notificationService.sendNotification({
        type: 'email',
        recipient: user.email,
        template: 'profile_update',
        data: {
          name: user.fullName,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to send profile update email:', error);
    }

    return user.toJSON();
  },

  async deleteUser(userId: string): Promise<void> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Delete profile picture if exists
    if (user.profilePictureId) {
      try {
        console.log('Original Profile Picture URL:', user.profilePictureId);
        await fileService.deleteProfilePicture(user.profilePictureId);
        logger.info('Profile picture deleted from database.');
      } catch (deleteError) {
        logger.error('Failed to delete profile picture:', deleteError);
      }
    }

    // Delete user
    const result = await userRepository.delete(userId);
    if (result.affected === 0) {
      throw new AppError('Failed to delete user', 500);
    }

    // Send account deletion notification
    try {
      await notificationService.sendNotification({
        type: 'email',
        recipient: user.email,
        template: 'account_deletion',
        data: {
          name: user.fullName,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to send account deletion email:', error);
    }
  }
};