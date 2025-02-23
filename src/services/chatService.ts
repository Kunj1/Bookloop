import { ChatMessage, IChatMessage } from '../models/Chat';
import { AppError } from '../utils/AppError';

export class ChatService {
  async saveMessage(senderId: string, receiverId: string, message: string): Promise<IChatMessage> {
    try {
      const chatMessage = new ChatMessage({
        senderId,
        receiverId,
        message
      });
      return await chatMessage.save();
    } catch (error) {
      throw new AppError('Failed to save message', 500);
    }
  }

  async getConversation(userId1: string, userId2: string): Promise<IChatMessage[]> {
    try {
      return await ChatMessage.find({
        $or: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 }
        ]
      }).sort({ createdAt: 1 });
    } catch (error) {
      throw new AppError('Failed to retrieve conversation', 500);
    }
  }
}