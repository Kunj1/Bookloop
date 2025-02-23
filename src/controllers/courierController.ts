import { Request, Response, NextFunction } from 'express';
import { CourierService } from '../services/courierService';

export class CourierController {
  private courierService: CourierService;

  constructor(courierService: CourierService) {
    this.courierService = courierService;
  }

  assignOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { donatorId, receiverId } = req.body;
      const order = await this.courierService.assignOrder(donatorId, receiverId);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  };

  cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const order = await this.courierService.cancelOrder(orderId);
      res.json(order);
    } catch (error) {
      next(error);
    }
  };

  completeOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const order = await this.courierService.completeOrder(orderId);
      res.json(order);
    } catch (error) {
      next(error);
    }
  };
}