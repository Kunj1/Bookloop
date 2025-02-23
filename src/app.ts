import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { configureRoutes } from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { AppDataSource } from './config/database';
import { notificationService } from './services/notificationService';
import { testCloudinaryConnection } from './config/cloudinary';
import logger from './utils/logger';
import { connectMongoDB } from './config/mongodb';
import { ErrorRequestHandler } from 'express';
import { createServer } from 'http';
import { ChatWebSocket } from './websocket/chatWebSocket';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize WebSocket
new ChatWebSocket(server);

// Health check endpoint
app.get('/health', async (req, res) => {
  let cloudinaryStatus = 'unknown';
  try {
    await testCloudinaryConnection();
    cloudinaryStatus = 'connected';
  } catch (error) {
    logger.error('Cloudinary connection test failed:', error);
    cloudinaryStatus = 'error';
  }

  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: AppDataSource.isInitialized,
      notification: notificationService.isInitialized(),
      cloudinary: cloudinaryStatus
    }
  });
});

// Routes
configureRoutes(app);

// Error handling
app.use(errorHandler as ErrorRequestHandler);

// Service initialization
async function initializeServices() {
  try {
    // Verify required environment variables
    const requiredEnvVars = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Test Cloudinary connection
    await testCloudinaryConnection();
    logger.info('✅ Cloudinary connection verified');

    // Connect to databases
    await AppDataSource.initialize();
    logger.info('✅ PostgreSQL connected');

    await connectMongoDB();
    logger.info('✅ MongoDB connected');

    // Initialize notification service
    await notificationService.initialize();
    logger.info('✅ Notification service initialized');

    // Start server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      logger.info(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`✅ Health check available at http://localhost:${PORT}/health`);
      logger.info('✅ WebSocket server started on ws://localhost:${PORT}');
    });

  } catch (error) {
    logger.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
}

// Error handlers
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('❌ Unhandled Rejection:', error);
  process.exit(1);
});

// Start application
initializeServices().catch(error => {
  logger.error('❌ Failed to start the application:', error);
  process.exit(1);
});

export default app;