import express from 'express';
import { CourseController } from '../controllers/courseController';
import { authMiddleware } from '../middlewares/auth';
import { CourseService } from '../services/courseService';
import { AppDataSource } from '../config/database';
import { Course } from '../models/Course';
import { User } from '../models/User';

const router = express.Router();

const courseRepository = AppDataSource.getRepository(Course);
const userRepository = AppDataSource.getRepository(User);

const courseService = new CourseService(courseRepository, userRepository);
const courseController = new CourseController(courseService);

router.post('/', authMiddleware, courseController.createCourse);
router.put('/:courseId', authMiddleware, courseController.updateCourse);
router.delete('/:courseId', authMiddleware, courseController.deleteCourse);
router.post('/:courseId/enroll', authMiddleware, courseController.enrollUser);

export default router;
