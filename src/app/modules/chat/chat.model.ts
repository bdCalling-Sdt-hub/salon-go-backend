import { model, Schema, Types } from 'mongoose';
import { ChatModel, IChat } from './chat.interface';

const chatSchema = new Schema<IChat, ChatModel>(
  {
    participants: [
      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    latestMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    latestMessageTime: { type: Date },
  },

  {
    timestamps: true,
  },
);
chatSchema.index({ participants: 1 });
export const Chat = model<IChat, ChatModel>('Chat', chatSchema);
