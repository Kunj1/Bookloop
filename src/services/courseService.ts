import { Repository } from 'typeorm';
import { Course } from '../models/Course';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { notificationService } from './notificationService';
import { fileService } from './fileService';
import logger from '../utils/logger';

interface CreateCourseDto {
  name: string;
  description: string;
  company: string;
  price: number;
  language: string;
  imageUrl?: string; // Optional in DTO since it will be handled by file upload
}

interface UpdateCourseDto extends Partial<CreateCourseDto> {
  imageUrl?: string; // Make sure imageUrl is explicitly included here
}

export class CourseService {
  constructor(
    private courseRepository: Repository<Course>,
    private userRepository: Repository<User>
  ) {}

  private async validateCoursePartner(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    if (user.role !== 'courses_partner') {
      throw new AppError('Only course partners can perform this action', 403);
    }
    return user;
  }

  private async handleImageUpload(
    file: Express.Multer.File,
    identifier: string
  ): Promise<string> {
    try {
      const uploadResult = await fileService.uploadFile(file, {
        identifier,
        folder: 'courses'
      });
      return uploadResult.url;
    } catch (error) {
      logger.error('Failed to upload course image:', error);
      throw new AppError('Failed to upload course image', 500);
    }
  }

  async createCourse(
    userId: string, 
    courseData: CreateCourseDto, 
    files: Express.Multer.File[]
  ): Promise<Course> {
    try {
      const creator = await this.validateCoursePartner(userId);

      // Validate file
      if (!files || files.length === 0) {
        throw new AppError('Course image is required', 400);
      }

      // Upload image
      const imageUrl = await this.handleImageUpload(files[0], creator.id);

      // Create course
      const course = this.courseRepository.create({
        ...courseData,
        imageUrl,
        creator,
        enrolledUsers: []
      });

      await this.courseRepository.save(course);

      // Send notification
      try {
        await notificationService.sendNotification({
          type: 'email',
          recipient: creator.email,
          template: 'course_creation',
          data: {
            name: creator.fullName,
            courseName: course.name,
            courseId: course.id
          }
        });
      } catch (error) {
        logger.error('Failed to send course creation email:', error);
        // Don't throw here - notification failure shouldn't fail course creation
      }

      return course;
    } catch (error) {
      logger.error('Error in createCourse:', error);
      if (error instanceof AppError) {
        throw error; // Re-throw AppErrors
      }
      throw new AppError('Failed to create course', 500);
    }
  }

  async updateCourse(
    courseId: string, 
    userId: string, 
    updateData: UpdateCourseDto,
    files?: Express.Multer.File[]
  ): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['creator']
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.creator.id !== userId) {
      throw new AppError('Only the course creator can edit this course', 403);
    }

    // Handle new image if provided
    if (files && files.length > 0) {
      // Delete existing image
      if (course.imageUrl) {
        try {
          await fileService.deleteFile(course.imageUrl);
        } catch (error) {
          logger.error('Failed to delete old course image:', error);
        }
      }

      // Upload new image
      const uploadResult = await fileService.uploadFile(files[0], {
        identifier: userId,
        folder: 'courses'
      });
      updateData.imageUrl = uploadResult.url;
    }

    Object.assign(course, updateData);
    await this.courseRepository.save(course);

    // Send notification to creator
    try {
      await notificationService.sendNotification({
        type: 'email',
        recipient: course.creator.email,
        template: 'course_update',
        data: {
          name: course.creator.fullName,
          courseName: course.name,
          courseId: course.id
        }
      });
    } catch (error) {
      logger.error('Failed to send course update email:', error);
    }

    return course;
  }

  async deleteCourse(courseId: string, userId: string): Promise<void> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['creator', 'enrolledUsers']
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.creator.id !== userId) {
      throw new AppError('Only the course creator can delete this course', 403);
    }

    // Delete course image
    if (course.imageUrl) {
      try {
        await fileService.deleteFile(course.imageUrl);
      } catch (error) {
        logger.error('Failed to delete course image:', error);
      }
    }

    // Notify enrolled users about course deletion
    for (const user of course.enrolledUsers) {
      try {
        await notificationService.sendNotification({
          type: 'email',
          recipient: user.email,
          template: 'course_deletion',
          data: {
            name: user.fullName,
            courseName: course.name
          }
        });
      } catch (error) {
        logger.error('Failed to send course deletion notification:', error);
      }
    }

    await this.courseRepository.remove(course);
  }

  async enrollUser(courseId: string, userId: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['enrolledUsers', 'creator']
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is already enrolled
    if (course.enrolledUsers.some(enrolledUser => enrolledUser.id === userId)) {
      throw new AppError('User is already enrolled in this course', 400);
    }

    course.enrolledUsers.push(user);
    await this.courseRepository.save(course);

    // Send notifications
    try {
      await notificationService.sendNotification({
        type: 'email',
        recipient: user.email,
        template: 'course_enrollment',
        data: {
          name: user.fullName,
          courseName: course.name,
          courseId: course.id
        }
      });
    } catch (error) {
      logger.error('Failed to send course enrollment email:', error);
    }

    return course;
  }
}