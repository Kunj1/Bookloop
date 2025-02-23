import express from 'express';
import { CourierController } from '../controllers/courierController';
import { authMiddleware } from '../middlewares/auth';
import { CourierService } from '../services/courierService';
import { AppDataSource } from '../config/database';
import { NotificationService } from '../services/notificationService';
import { CourierOrder } from '../models/Courier';
import { User } from '../models/User';

const router = express.Router();

// Get repositories from TypeORM AppDataSource
const courierOrderRepository = AppDataSource.getRepository(CourierOrder);
const userRepository = AppDataSource.getRepository(User);
const notificationService = NotificationService.getInstance();

const courierService = new CourierService(
  courierOrderRepository,
  userRepository,
  notificationService
);
const courierController = new CourierController(courierService);

router.post('/orders', authMiddleware, courierController.assignOrder);
router.post('/orders/:orderId/cancel', authMiddleware, courierController.cancelOrder);
router.post('/orders/:orderId/complete', authMiddleware, courierController.completeOrder);

export default router;
