import { model, Schema } from 'mongoose';
import { IMessage, MessageModel } from './message.interface';

const messageSchema = new Schema<IMessage, MessageModel>(
  {
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String },
    isRead: { type: Boolean, default: false },
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    images: { type: [String] },
    messageType: {
      type: String,
      enum: ['text', 'image', 'both'],
      required: true,
    },
  },
  { timestamps: true },
);

messageSchema.index({ chatId: 1 });

export const Message = model<IMessage, MessageModel>('Message', messageSchema);
