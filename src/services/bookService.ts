import { AppDataSource } from '../config/database';
import { Book } from '../models/Book';
import { User } from '../models/User';
import { CourierOrder } from '../models/Courier';
import { AppError } from '../utils/AppError';
import { fileService } from './fileService';
import { notificationService } from './notificationService';
import logger from '../utils/logger';

const bookRepository = AppDataSource.getRepository(Book);
const userRepository = AppDataSource.getRepository(User);
const courierOrderRepository = AppDataSource.getRepository(CourierOrder);

export const bookService = {
  async createBook(bookData: Partial<Book>, files?: Express.Multer.File[]): Promise<Book> {
    try {
      // Upload images if provided
      let imageUrls: string[] = [];
      if (files && files.length > 0) {
        const uploadPromises = files.map(file => 
          fileService.uploadFile(file, { identifier: bookData.createdBy?.id || 'unknown', folder: 'books' })
        );
        const uploadResults = await Promise.all(uploadPromises);
        imageUrls = uploadResults.map(result => result.url);
      }

      // Create book with uploaded image URLs
      const book = bookRepository.create({
        ...bookData,
        imageUrls,
        // TODO: AI Image verification and price assignment
        // const verificationResult = await aiService.verifyBookImages(imageUrls);
        // price: verificationResult.suggestedPrice
      });

      await bookRepository.save(book);

      // Send notification
      try {
        await notificationService.sendNotification({
          type: 'email',
          recipient: book.createdBy.email,
          template: 'book_created',
          data: {
            name: book.createdBy.fullName,
            bookTitle: book.name,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        logger.error('Failed to send book creation email:', error);
      }

      return book;
    } catch (error) {
      logger.error('Error in createBook:', error);
      throw new AppError('Failed to create book', 500);
    }
  },

  async updateBook(
    bookId: string,
    userId: string,
    bookData: Partial<Book>,
    files?: Express.Multer.File[]
  ): Promise<Book> {
    const book = await bookRepository.findOne({
      where: { id: bookId },
      relations: ['createdBy']
    });

    if (!book) {
      throw new AppError('Book not found', 404);
    }

    if (book.createdBy.id !== userId) {
      throw new AppError('Unauthorized to update this book', 403);
    }

    // Handle new images if provided
    if (files && files.length > 0) {
      // Delete existing images
      if (book.imageUrls) {
        await Promise.all(book.imageUrls.map(url => 
          fileService.deleteFile(url)
        ));
      }

      // Upload new images
      const uploadPromises = files.map(file => 
        fileService.uploadFile(file, { identifier: bookData.createdBy?.id || 'unknown', folder: 'books' })
      );
      const uploadResults = await Promise.all(uploadPromises);
      bookData.imageUrls = uploadResults.map(result => result.url);
    }

    // Update book
    Object.assign(book, bookData);
    await bookRepository.save(book);

    // Send notification
    try {
      await notificationService.sendNotification({
        type: 'email',
        recipient: book.createdBy.email,
        template: 'book_updated',
        data: {
          name: book.createdBy.fullName,
          bookTitle: book.name,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to send book update email:', error);
    }

    return book;
  },

  async deleteBook(bookId: string, userId: string): Promise<void> {
    const book = await bookRepository.findOne({
      where: { id: bookId },
      relations: ['createdBy']
    });

    if (!book) {
      throw new AppError('Book not found', 404);
    }

    if (book.createdBy.id !== userId) {
      throw new AppError('Unauthorized to delete this book', 403);
    }

    // Delete associated images
    if (book.imageUrls) {
      await Promise.all(book.imageUrls.map(url => 
        fileService.deleteFile(url)
      ));
    }

    await bookRepository.remove(book);

    // Send notification
    try {
      await notificationService.sendNotification({
        type: 'email',
        recipient: book.createdBy.email,
        template: 'book_deleted',
        data: {
          name: book.createdBy.fullName,
          bookTitle: book.name,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to send book deletion email:', error);
    }
  },

  async getAllBooks(filters: any): Promise<Book[]> {
    const query = bookRepository.createQueryBuilder('book')
      .leftJoinAndSelect('book.createdBy', 'user');

    // Apply filters
    if (filters.language) {
      query.andWhere('book.language = :language', { language: filters.language });
    }
    if (filters.genre) {
      query.andWhere('book.genre = :genre', { genre: filters.genre });
    }
    if (filters.minPrice) {
      query.andWhere('book.price >= :minPrice', { minPrice: filters.minPrice });
    }
    if (filters.maxPrice) {
      query.andWhere('book.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }
    if (filters.sold !== undefined) {
      query.andWhere('book.sold = :sold', { sold: filters.sold });
    }

    return query.getMany();
  },

  async getOneBook(bookId: string): Promise<Book> {
    const book = await bookRepository.findOne({
      where: { id: bookId },
      relations: ['createdBy']
    });

    if (!book) {
      throw new AppError('Book not found', 404);
    }

    return book;
  },

  async markAsSold(bookId: string, userId: string): Promise<Book> {
    const book = await bookRepository.findOne({
      where: { id: bookId },
      relations: ['createdBy']
    });

    if (!book) {
      throw new AppError('Book not found', 404);
    }

    if (book.createdBy.id !== userId) {
      throw new AppError('Unauthorized to update this book', 403);
    }

    if (book.sold) {
      throw new AppError('Book is already marked as sold', 400);
    }

    book.sold = true;
    await bookRepository.save(book);

    // Send notifications
    try {
      await notificationService.sendNotification({
        type: 'email',
        recipient: book.createdBy.email,
        template: 'book_sold',
        data: {
          name: book.createdBy.fullName,
          bookTitle: book.name,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to send book sold email:', error);
    }

    return book;
  }
};