import { Schema, model, Document } from 'mongoose';

export interface IChatMessage extends Document {
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: Date;
}

const chatMessageSchema = new Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const ChatMessage = model<IChatMessage>('ChatMessage', chatMessageSchema);