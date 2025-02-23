import { Request, Response, NextFunction } from 'express';
import { CourseService } from '../services/courseService';
import { AppError } from '../utils/AppError';

export class CourseController {
  constructor(private courseService: CourseService) {}

  createCourse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      
      // Check if files exist in the request
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new AppError('Course image file is required', 400);
      }

      const files = req.files as Express.Multer.File[];
      const course = await this.courseService.createCourse(userId, req.body, files);
      res.status(201).json(course);
    } catch (error) {
      // Pass AppErrors directly, wrap other errors
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to create course', 500));
      }
    }
  };

  updateCourse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      const userId = req.user!.id;
      const files = req.files as Express.Multer.File[] | undefined;
      const course = await this.courseService.updateCourse(courseId, userId, req.body, files);
      res.json(course);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Failed to update course', 500));
      }
    }
  };

  deleteCourse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      const userId = req.user!.id;
      await this.courseService.deleteCourse(courseId, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  enrollUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      const userId = req.user!.id;
      const course = await this.courseService.enrollUser(courseId, userId);
      res.json(course);
    } catch (error) {
      next(error);
    }
  };
}