import { Express } from 'express';
import authRoutes from './auth';
import bookRoutes from './book';
import chatRoutes from './chat';
import courierRoutes from './courier';
import courseRoutes from './course';
import userRoutes from './user';

export function configureRoutes(app: Express) {
  app.use('/api/auth', authRoutes);
  app.use('/api/book', bookRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/courier', courierRoutes);
  app.use('/api/course', courseRoutes);
  app.use('/api/users', userRoutes);
}