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
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { uploadToCloudinary } from '../../../utils/cloudinary';

const sendMessage = async (payload: IMessage, chatId: string) => {
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

  // // Determine message type

  payload.receiverId = receiver._id;
  // ...existing code...

  payload.messageType =
    payload.images && payload.images.length > 0 && payload.message
      ? 'both'
      : payload.images && payload.images.length > 0
      ? 'image'
      : 'text';

  // ...existing code...

  if (payload.messageType === 'both' || payload.messageType === 'image') {
    if (payload.images.length > 0) {
      const uploadedImages = await uploadToCloudinary(
        payload.images,
        'message',
        'image',
      );
      if (!uploadedImages || uploadedImages.length === 0) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to upload image to Cloudinary',
        );
      }
      payload.images = uploadedImages;
    }
  }

  const result = await Message.create({ ...payload, chatId });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to send message.');
  }
  //update the latest message

  await Chat.findByIdAndUpdate(
    chatId,
    { latestMessage: result._id, latestMessageTime: new Date() },
    { new: true },
  );

  const populatedResult = await (
    await result
  ).populate('receiverId', { name: 1, profile: 1 });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.io?.emit(`getMessage::${chatId}`, populatedResult);

  await Chat.findByIdAndUpdate(
    payload.chatId,
    { latestMessage: result._id, latestMessageTime: new Date() },
    { new: true },
  );

  return populatedResult;
};

const getMessagesByChatId = async (
  chatId: string,
  paginationOptions: IPaginationOptions,
) => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const result = await Message.find({ chatId })
    .populate({
      path: 'receiverId',
      select: {
        name: 1,
        profile: 1,
        role: 1,
      },
    })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  const total = await Message.countDocuments({ chatId });

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get messages.');
  }
  return {
    meta: {
      page,
      limit,
      total: total,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

export const MessageService = {
  sendMessage,
  getMessagesByChatId,
};
