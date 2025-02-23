import { Request, Response, NextFunction } from 'express';
import { bookService } from '../services/bookService';
import { AppError } from '../utils/AppError';
import { RequestWithUser } from '../types/express';
import { validateBook } from '../utils/validator';

export const bookController = {
  createBook: async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const { error } = validateBook.validate(req.body);
      if (error) {
        res.status(400).json({
          message: error.details[0].message,
          field: error.details[0].context?.key
        });
        return;
      }

      const files = req.files as Express.Multer.File[];
      
      const book = await bookService.createBook({
        ...req.body,
        createdBy: req.user,
      }, files);

      res.status(201).json(book);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to create book' });
    }
  },

  updateBook: async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const { error } = validateBook.validate(req.body);
      if (error) {
        res.status(400).json({
          message: error.details[0].message,
          field: error.details[0].context?.key
        });
        return;
      }

      const files = req.files as Express.Multer.File[];
      
      const book = await bookService.updateBook(
        req.params.id,
        req.user.id,
        req.body,
        files
      );

      res.json(book);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to update book' });
    }
  },

  deleteBook: async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      await bookService.deleteBook(req.params.id, req.user.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to delete book' });
    }
  },

  getAllBooks: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const books = await bookService.getAllBooks(req.query);
      res.json(books);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to fetch books' });
    }
  },

  getOneBook: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const book = await bookService.getOneBook(req.params.id);
      res.json(book);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to fetch book' });
    }
  },

  markAsSold: async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const book = await bookService.markAsSold(req.params.id, req.user.id);
      res.json(book);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to mark book as sold' });
    }
  }
};