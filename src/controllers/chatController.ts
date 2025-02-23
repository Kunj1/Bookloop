import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chatService';
import { AppError } from '../utils/AppError';

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  getConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId1, userId2 } = req.params;
      const messages = await this.chatService.getConversation(userId1, userId2);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  };
}