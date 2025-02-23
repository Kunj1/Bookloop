import { Repository } from 'typeorm';
import { CourierOrder, CourierOrderStatus } from '../models/Courier';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { NotificationService } from './notificationService';

export class CourierService {
  private courierOrderRepository: Repository<CourierOrder>;
  private userRepository: Repository<User>;
  private notificationService: NotificationService;

  constructor(
    courierOrderRepository: Repository<CourierOrder>,
    userRepository: Repository<User>,
    notificationService: NotificationService
  ) {
    this.courierOrderRepository = courierOrderRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
  }

  async assignOrder(donatorId: string, receiverId: string): Promise<CourierOrder> {
    const donator = await this.userRepository.findOne({ where: { id: donatorId } });
    if (!donator) throw new AppError('Donator not found', 404);

    const receiver = await this.userRepository.findOne({ where: { id: receiverId } });
    if (!receiver) throw new AppError('Receiver not found', 404);

    // Find available courier partners in the same state
    const courierPartners = await this.userRepository.find({
      where: {
        role: 'courier_partner',
        state: donator.state
      }
    });

    if (courierPartners.length === 0) {
      throw new AppError('Courier service not available in your city', 400);
    }

    // Randomly select a courier partner
    const randomIndex = Math.floor(Math.random() * courierPartners.length);
    const selectedCourierPartner = courierPartners[randomIndex];

    const now = new Date();

    // Create new order
    const order = new CourierOrder();
    order.donator = donator;
    order.receiver = receiver;
    order.courierPartner = selectedCourierPartner;
    order.pickupAddress = donator.address;
    order.deliveryAddress = receiver.address;
    order.status = CourierOrderStatus.ASSIGNED;
    order.assignedAt = now;

    const savedOrder = await this.courierOrderRepository.save(order);

    // Send email notifications
    await this.notificationService.sendNotification({
      type: 'email',
      recipient: selectedCourierPartner.email,
      template: 'courier_assignment',
      data: {
        name: selectedCourierPartner.fullName,
        orderId: savedOrder.id,
        pickupAddress: savedOrder.pickupAddress,
        deliveryAddress: savedOrder.deliveryAddress,
        timestamp: now.toISOString()
      }
    });

    // Send notifications to donator and receiver
    const statusNotification = {
      type: 'email' as const,
      template: 'order_status_update',
      data: {
        orderId: savedOrder.id,
        status: 'Assigned',
        timestamp: now.toISOString()
      }
    };

    await this.notificationService.sendNotification({
      ...statusNotification,
      recipient: donator.email,
      data: {
        ...statusNotification.data,
        name: donator.fullName
      }
    });

    await this.notificationService.sendNotification({
      ...statusNotification,
      recipient: receiver.email,
      data: {
        ...statusNotification.data,
        name: receiver.fullName
      }
    });

    return savedOrder;
  }

  async cancelOrder(orderId: string): Promise<CourierOrder> {
    const order = await this.courierOrderRepository.findOne({
      where: { id: orderId },
      relations: ['donator', 'receiver', 'courierPartner']
    });

    if (!order) throw new AppError('Order not found', 404);
    if (order.status === CourierOrderStatus.COMPLETED) {
      throw new AppError('Cannot cancel completed order', 400);
    }

    order.status = CourierOrderStatus.CANCELLED;
    const savedOrder = await this.courierOrderRepository.save(order);

    // Send email notifications
    const timestamp = new Date().toISOString();
    const statusNotification = {
      type: 'email' as const,
      template: 'order_status_update',
      data: {
        orderId: savedOrder.id,
        status: 'Cancelled',
        timestamp
      }
    };
    
    if (order.donator) {
      await this.notificationService.sendNotification({
        ...statusNotification,
        recipient: order.donator.email,
        data: {
          ...statusNotification.data,
          name: order.donator.fullName
        }
      });
    }

    if (order.receiver) {
      await this.notificationService.sendNotification({
        ...statusNotification,
        recipient: order.receiver.email,
        data: {
          ...statusNotification.data,
          name: order.receiver.fullName
        }
      });
    }

    if (order.courierPartner) {
      await this.notificationService.sendNotification({
        ...statusNotification,
        recipient: order.courierPartner.email,
        data: {
          ...statusNotification.data,
          name: order.courierPartner.fullName
        }
      });
    }

    return savedOrder;
  }

  async completeOrder(orderId: string): Promise<CourierOrder> {
    const order = await this.courierOrderRepository.findOne({
      where: { id: orderId },
      relations: ['donator', 'receiver', 'courierPartner']
    });

    if (!order) throw new AppError('Order not found', 404);
    if (order.status !== CourierOrderStatus.ASSIGNED) {
      throw new AppError('Order must be assigned before completion', 400);
    }

    const now = new Date();
    order.status = CourierOrderStatus.COMPLETED;
    order.completedAt = now;
    const savedOrder = await this.courierOrderRepository.save(order);

    // Send email notifications
    const timestamp = now.toISOString();
    const statusNotification = {
      type: 'email' as const,
      template: 'order_status_update',
      data: {
        orderId: savedOrder.id,
        status: 'Completed',
        timestamp
      }
    };

    if (order.donator) {
      await this.notificationService.sendNotification({
        ...statusNotification,
        recipient: order.donator.email,
        data: {
          ...statusNotification.data,
          name: order.donator.fullName
        }
      });
    }

    if (order.receiver) {
      await this.notificationService.sendNotification({
        ...statusNotification,
        recipient: order.receiver.email,
        data: {
          ...statusNotification.data,
          name: order.receiver.fullName
        }
      });
    }

    if (order.courierPartner) {
      await this.notificationService.sendNotification({
        ...statusNotification,
        recipient: order.courierPartner.email,
        data: {
          ...statusNotification.data,
          name: order.courierPartner.fullName
        }
      });
    }

    return savedOrder;
  }
}