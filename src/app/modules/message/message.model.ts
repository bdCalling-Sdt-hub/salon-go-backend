import { model, Schema } from 'mongoose';
import { IMessage, MessageModel } from './message.interface';

const messageSchema = new Schema<IMessage, MessageModel>({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String },
  isRead: { type: Boolean, default: false },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  image: { type: String },
  type: { type: String, enum: ['text', 'image', 'both'], required: true },
});

export const Message = model<IMessage, MessageModel>('Message', messageSchema);
