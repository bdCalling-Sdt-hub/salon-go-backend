/* eslint-disable no-undef */
import { JwtPayload } from 'jsonwebtoken';
import { IMessage } from './message.interface';
import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Chat } from '../chat/chat.model';
import { Types } from 'mongoose';
import { Message } from './message.model';

const sendMessage = async (
  user: JwtPayload,
  payload: IMessage,
  chatId: string,
) => {
  const senderId = new Types.ObjectId(user.id);

  // Find chat and receiver in parallel
  const [chat, receiver] = await Promise.all([
    Chat.findById(chatId),
    User.findById(payload.receiverId),
  ]);

  // Check if chat exists
  if (!chat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Chat does not exist.');
  }

  // Check if receiver exists
  if (!receiver) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found!');
  }

  // Determine message type
  payload.senderId = senderId;
  payload.receiverId = receiver._id;

  payload.type =
    payload.image && payload.message
      ? 'both'
      : payload.image
      ? 'image'
      : 'text';

  // Create the message
  const result = await Message.create({ ...payload, chatId });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to send message.');
  }

  const populatedResult = await (
    await result.populate('senderId', { name: 1, email: 1 })
  ).populate('receiverId', { name: 1, email: 1 });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.io?.emit(`messageReceived::${chatId}`, populatedResult);

  // Update the chat with latest message details
  await Chat.findByIdAndUpdate(
    payload.chatId,
    { latestMessage: result._id, latestMessageTime: new Date() },
    { new: true },
  );

  return populatedResult;
};

const getMessagesByChatId = async (chatId: string) => {
  const result = await Message.find({ chatId })
    .populate({
      path: 'senderId',
      select: {
        name: 1,

        role: 1,
      },
    })
    .populate({
      path: 'receiverId',
      select: {
        name: 1,

        role: 1,
      },
    });

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get messages.');
  }
  return result;
};

export const MessageService = {
  sendMessage,
  getMessagesByChatId,
};
