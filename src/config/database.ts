import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../models/User';
import { Book } from '../models/Book';
import { CourierOrder } from '../models/Courier';
import { Course } from '../models/Course';
import { CreditHistory } from '../models/CreditHistory';
import { WebsiteReview } from '../models/WebsiteReview';

export const dbConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Book, CourierOrder, Course, CreditHistory, WebsiteReview],
  synchronize: process.env.NODE_ENV === 'development',
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
  migrations: [__dirname + '/../migrations/*.ts'],
  migrationsRun: true,
  logging: process.env.NODE_ENV === 'development',
  ssl: { rejectUnauthorized: false }
};

export const AppDataSource = new DataSource(dbConfig);