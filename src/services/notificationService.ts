import { Channel } from 'amqplib';
import nodemailer from 'nodemailer';
import { connectRabbitMQ } from '../config/rabbitmq';
import logger from '../utils/logger';
import { AppError } from '../utils/AppError';
import { EmailOptions , NotificationType , TemplatedEmailData , NotificationPayload } from '../types/notification';

export interface EmailContent {
  subject: string;
  text: string;
  html?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private channel: Channel | null = null;
  private emailTransport: nodemailer.Transporter;
  private initialized = false;

  private constructor() {
    this.emailTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Verify email transport
      await this.emailTransport.verify();
      logger.info('Email transport verified');

      // Setup RabbitMQ connection
      const channelConnection = await connectRabbitMQ();
      if (!channelConnection) {
        throw new AppError('Failed to connect to RabbitMQ', 500);
      }
      this.channel = channelConnection;

      // Setup queues and exchanges
      await this.setupQueues();
      
      // Start processing messages
      await this.startProcessing();
      
      this.initialized = true;
      logger.info('Notification service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize notification service', error);
      throw error;
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  private async setupQueues(): Promise<void> {
    if (!this.channel) return;

    // Setup dead letter exchange
    await this.channel.assertExchange('notification_dlx', 'direct', { durable: true });
    await this.channel.assertQueue('notification_dlq', { durable: true });
    await this.channel.bindQueue('notification_dlq', 'notification_dlx', 'notification_routing_key');

    // Setup main notification queue
    await this.channel.assertQueue('notification_queue', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'notification_dlx',
        'x-dead-letter-routing-key': 'notification_routing_key',
        'x-message-ttl': 86400000 // 24 hours
      }
    });
  }

  public async sendNotification(payload: NotificationPayload): Promise<void> {
    if (!this.initialized) {
      throw new AppError('Notification service not initialized', 500);
    }

    if (!this.channel) {
      throw new AppError('RabbitMQ channel not available', 500);
    }

    const message = Buffer.from(JSON.stringify(payload));
    this.channel.sendToQueue('notification_queue', message, {
      persistent: true,
      headers: {
        'x-retry-count': 0
      }
    });

    logger.info(`Notification queued: ${payload.type} to ${payload.recipient}`);
  }

  private async startProcessing(): Promise<void> {
    if (!this.channel) return;
  
    this.channel.consume('notification_queue', async (msg) => {
      if (!msg) return;
  
      try {
        const payload = JSON.parse(msg.content.toString()) as NotificationPayload;
        await this.processNotification(payload);
        this.channel?.ack(msg);
        logger.info(`Successfully processed ${payload.type} notification for ${payload.recipient}`);
      } catch (err) {
        // Type guard for Error object
        const error = err as Error;
        const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) as number;
        
        if (retryCount < 3) {
          // Acknowledge the original message
          this.channel?.ack(msg);
          
          // Republish with incremented retry count after delay
          setTimeout(() => {
            this.channel?.publish('', 'notification_queue', msg.content, {
              persistent: true,
              headers: {
                'x-retry-count': retryCount + 1,
                'x-last-error': error.message || 'Unknown error'
              }
            });
          }, Math.pow(2, retryCount) * 1000);
          
          logger.warn(`Retrying ${retryCount + 1}/3 for notification`, {
            recipient: JSON.parse(msg.content.toString()).recipient,
            retryCount: retryCount + 1,
            error: error.message || 'Unknown error'
          });
        } else {
          // After max retries, acknowledge the message and send to dead letter queue
          this.channel?.ack(msg);
          
          // Publish to dead letter exchange
          this.channel?.publish('notification_dlx', 'notification_routing_key', msg.content, {
            persistent: true,
            headers: {
              'x-retry-count': retryCount,
              'x-last-error': error.message || 'Unknown error'
            }
          });
          
          logger.error('Notification failed after max retries', {
            error: error.message || 'Unknown error',
            payload: JSON.parse(msg.content.toString()),
            retryCount
          });
        }
      }
    }, { noAck: false });
  }

  private async processNotification(payload: NotificationPayload): Promise<void> {
    switch (payload.type) {
      case 'email':
        if (payload.template) {
          // Handle templated email
          const emailContent = this.getEmailTemplate(payload.template, payload.data);
          await this.sendEmail(payload.recipient, emailContent);
        } else if (payload.emailOptions) {
          // Handle direct email
          await this.sendEmail(payload.recipient, payload.emailOptions);
        } else {
          throw new AppError('Either template or emailOptions must be provided for email notifications', 400);
        }
        break;
      case 'sms':
        await this.sendSMS(payload.recipient, payload.data!.message);
        break;
      case 'push':
        await this.sendPushNotification(payload.recipient, payload.data);
        break;
      default:
        throw new AppError(`Unknown notification type: ${payload.type}`, 400);
    }
  }

  private async sendEmail(to: string, options: EmailOptions): Promise<void> {
    if (!this.initialized) {
      throw new AppError('Notification service not initialized', 500);
    }

    try {
      await this.emailTransport.sendMail({
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
        to,
        ...options,
        headers: {
          'X-Application-Name': 'Bookloop'
        }
      });
      logger.info(`Email sent successfully to ${to}`);
    } catch (error) {
      logger.error('Failed to send email', { error, to });
      throw error;
    }
  }

  private async sendSMS(to: string, message: string): Promise<void> {
    // Implement SMS provider integration
    logger.info(`SMS sent to ${to}: ${message}`);
  }

  private async sendPushNotification(recipient: string, data: any): Promise<void> {
    // Implement push notification provider integration
    logger.info(`Push notification sent to ${recipient}`);
  }

  private getEmailTemplate(template: string, data: any): EmailContent {
    switch (template) {
      case 'welcome_email':
        return {
          subject: 'Welcome to Bookloop',
          text: `Welcome ${data.name}! Thank you for joining us.`,
          html: `
            <h2>Welcome to Bookloop</h2>
            <p>Hello ${data.name}!</p>
            <p>Thank you for joining Bookloop. We are excited to welcome you to our community of book lovers and donors.</p>
            <p>At Bookloop, you can explore a wide range of books, donate your favorites, and even earn rewards for your contributions.</p>
            <p>Get started by visiting our website and discovering all the opportunities waiting for you.</p>
            <p>Happy reading!</p>
            <p>Best regards,<br><strong>The Bookloop Team</strong></p>
          `
        };
          case 'password_update':
            return {
              subject: 'Password Update Notification',
              text: `Dear ${data.name}, your account password was updated on ${new Date(data.timestamp).toLocaleString()}.`,
              html: `
                <h2>Password Update Notification</h2>
                <p>Dear ${data.name},</p>
                <p>This email is to confirm that your account password was successfully updated on ${new Date(data.timestamp).toLocaleString()}.</p>
                <p>If you did not make this change, please contact our support team immediately and secure your account.</p>
                <br>
                <p>Best regards,</p>
                <p>The Bookloop Team</p>
              `
        };
        case 'profile_update':
        return {
          subject: 'Profile Update Notification',
          text: `Dear ${data.name}, your profile information was updated on ${new Date(data.timestamp).toLocaleString()}.`,
          html: `
            <h2>Profile Update Notification</h2>
            <p>Dear ${data.name},</p>
            <p>This email is to confirm that your profile information was successfully updated on ${new Date(data.timestamp).toLocaleString()}.</p>
            <p>If you did not make these changes, please contact our support team immediately.</p>
            <br>
            <p>Best regards,</p>
            <p>The Bookloop Team</p>
          `
        };
        case 'account_deletion':
        return {
          subject: 'Account Deletion Confirmation',
          text: `Dear ${data.name}, your account was permanently deleted on ${new Date(data.timestamp).toLocaleString()}.`,
          html: `
            <h2>Account Deletion Confirmation</h2>
            <p>Dear ${data.name},</p>
            <p>This email is to confirm that your Bookloop account was permanently deleted on ${new Date(data.timestamp).toLocaleString()}.</p>
            <p>We're sorry to see you go. If you believe this was done in error, please contact our support team immediately.</p>
            <p>Thank you for being part of our community.</p>
            <br>
            <p>Best regards,</p>
            <p>The Bookloop Team</p>
          `
        };
        case 'courier_assignment':
        return {
          subject: 'New Courier Order Assignment',
          text: `Dear ${data.name}, you have been assigned a new delivery order #${data.orderId}. Pickup: ${data.pickupAddress}. Delivery: ${data.deliveryAddress}. Assignment time: ${new Date(data.timestamp).toLocaleString()}.`,
          html: `
            <h2>New Courier Order Assignment</h2>
            <p>Dear ${data.name},</p>
            <p>You have been assigned a new delivery order. Here are the details:</p>
            <ul>
              <li><strong>Order ID:</strong> ${data.orderId}</li>
              <li><strong>Pickup Address:</strong> ${data.pickupAddress}</li>
              <li><strong>Delivery Address:</strong> ${data.deliveryAddress}</li>
              <li><strong>Assignment Time:</strong> ${new Date(data.timestamp).toLocaleString()}</li>
            </ul>
            <p>Please proceed with the pickup as soon as possible.</p>
            <p>If you have any questions or concerns, please contact our support team.</p>
            <br>
            <p>Best regards,</p>
            <p>The Bookloop Team</p>
          `
        };

      case 'order_status_update':
        return {
          subject: `Order ${data.orderId} Status Update: ${data.status}`,
          text: `Dear ${data.name}, your order #${data.orderId} status has been updated to ${data.status} on ${new Date(data.timestamp).toLocaleString()}.`,
          html: `
            <h2>Order Status Update</h2>
            <p>Dear ${data.name},</p>
            <p>This email is to inform you that your order status has been updated:</p>
            <ul>
              <li><strong>Order ID:</strong> ${data.orderId}</li>
              <li><strong>New Status:</strong> ${data.status}</li>
              <li><strong>Update Time:</strong> ${new Date(data.timestamp).toLocaleString()}</li>
            </ul>
            <p>If you have any questions about this update, please contact our support team.</p>
            <br>
            <p>Best regards,</p>
            <p>The Bookloop Team</p>
          `
        };
        case 'course_creation':
        return {
          subject: 'Course Created Successfully',
          text: `Dear ${data.name}, your course "${data.courseName}" has been successfully created with ID: ${data.courseId}. You can now start managing your course and accepting enrollments.`,
          html: `
            <h2>Course Created Successfully</h2>
            <p>Dear ${data.name},</p>
            <p>Your course has been successfully created and is now live on our platform!</p>
            <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #0066cc;">
              <p><strong>Course Name:</strong> ${data.courseName}</p>
              <p><strong>Course ID:</strong> ${data.courseId}</p>
            </div>
            <p>You can now:</p>
            <ul>
              <li>Manage your course content</li>
              <li>Monitor enrollments</li>
              <li>Interact with enrolled students</li>
            </ul>
            <p>Visit your dashboard to start managing your course.</p>
            <br>
            <p>Best regards,</p>
            <p>The Bookloop Team</p>
          `
        };

      case 'course_update':
        return {
          subject: 'Course Update Confirmation',
          text: `Dear ${data.name}, your course "${data.courseName}" (ID: ${data.courseId}) has been successfully updated.`,
          html: `
            <h2>Course Update Confirmation</h2>
            <p>Dear ${data.name},</p>
            <p>Your course has been successfully updated:</p>
            <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #0066cc;">
              <p><strong>Course Name:</strong> ${data.courseName}</p>
              <p><strong>Course ID:</strong> ${data.courseId}</p>
            </div>
            <p>The changes you made have been saved and are now live on the platform.</p>
            <p>You can review these changes by visiting your course dashboard.</p>
            <br>
            <p>Best regards,</p>
            <p>The Bookloop Team</p>
          `
        };

      case 'course_deletion':
        return {
          subject: 'Important: Course Deletion Notice',
          text: `Dear ${data.name}, the course "${data.courseName}" has been deleted from the platform. If you were enrolled in this course, please contact support for further assistance.`,
          html: `
            <h2>Course Deletion Notice</h2>
            <p>Dear ${data.name},</p>
            <p>We want to inform you that the following course has been deleted from our platform:</p>
            <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #ff4444;">
              <p><strong>Course Name:</strong> ${data.courseName}</p>
            </div>
            <p>If you were enrolled in this course and have any questions or concerns, please don't hesitate to contact our support team.</p>
            <p>If you made any payments related to this course, our team will be in touch regarding refund procedures.</p>
            <br>
            <p>Best regards,</p>
            <p>The Bookloop Team</p>
          `
        };

      case 'course_enrollment':
        return {
          subject: 'Welcome to Your New Course!',
          text: `Dear ${data.name}, you have successfully enrolled in "${data.courseName}" (ID: ${data.courseId}). You can now start learning!`,
          html: `
            <h2>Welcome to Your New Course!</h2>
            <p>Dear ${data.name},</p>
            <p>Congratulations! You have successfully enrolled in:</p>
            <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #00cc66;">
              <p><strong>Course Name:</strong> ${data.courseName}</p>
              <p><strong>Course ID:</strong> ${data.courseId}</p>
            </div>
            <p>You can now:</p>
            <ul>
              <li>Access all course materials</li>
              <li>Participate in course discussions</li>
              <li>Track your progress</li>
              <li>Connect with other learners</li>
            </ul>
            <p>Visit your learning dashboard to get started with your course.</p>
            <p>We wish you success in your learning journey!</p>
            <br>
            <p>Best regards,</p>
            <p>The Bookloop Team</p>
          `
        };
      default:
        throw new AppError(`Email template '${template}' not found`, 400);
    }
  }
}

export const notificationService = NotificationService.getInstance();