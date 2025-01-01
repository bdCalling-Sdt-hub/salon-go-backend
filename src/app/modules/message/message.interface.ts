import { Model, Types } from 'mongoose';
import { IChat } from '../chat/chat.interface';

export type IMessage = {
  _id: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  message: string;
  isRead: boolean;
  chatId: Types.ObjectId | IChat;
  image: string;
  type: 'text' | 'image' | 'both';
  createdAt: Date;
  updatedAt: Date;
};

export type MessageModel = Model<IChat>;
