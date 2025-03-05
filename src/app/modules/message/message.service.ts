/* eslint-disable no-undef */
import { JwtPayload } from 'jsonwebtoken';
import { IMessage } from './message.interface';
import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Chat } from '../chat/chat.model';
import { Message } from './message.model';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { uploadToCloudinary } from '../../../utils/cloudinary';
import sendMessageRelatedInfo from '../../../helpers/socketMessageHelper';

const sendMessage = async (user:JwtPayload,payload: IMessage, chatId: string) => {
  // Find chat and receiver in parallel
  const [chat, receiver] = await Promise.all([
    Chat.findById(chatId).populate<{ participants: [{ _id: string; name: string; profile: string }] }>({
      path: 'participants',
      select: { name: 1, profile: 1 },
    })
    .populate<{ latestMessage: { message: string } }>({
      path: 'latestMessage',
      select: {
        message: 1,
      },
    }),
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
    payload.image && payload.image.length > 0 && payload.message
      ? 'both'
      : payload.image && payload.image.length > 0
      ? 'image'
      : 'text';

  // ...existing code...

  if (payload.messageType === 'both' || payload.messageType === 'image') {
    if (payload.image.length > 0) {
      const uploadedImage = await uploadToCloudinary(
        payload.image,
        'message',
        'image',
      );
      if (!uploadedImage || uploadedImage.length === 0) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to upload image to Cloudinary',
        );
      }
      payload.image = uploadedImage[0];
    }
  }

  const result = await Message.create({ ...payload, chatId });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to send message.');
  }
  //update the latest message

 const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { latestMessage: result._id, latestMessageTime: new Date() },
    { new: true },
  );

  const populatedResult = await (
    await result
  ).populate('receiverId', { name: 1, profile: 1 });

  sendMessageRelatedInfo(
    'getMessage',
    chatId,
    populatedResult
    );

  //emit the unread count to the client
  //eslint-disable-next-line @typescript-eslint/ban-ts-comment
  const unreadCount = await Message.countDocuments({ chatId, isRead: false });

  const otherParticipant = chat.participants.find(
    (participant: any) => participant._id.toString() !== user.id,
  );

  //customize chat list data
  const customizedChat = {
    chatId: chat._id,
    name: otherParticipant?.name,
    profile: otherParticipant?.profile,
    latestMessage: payload.messageType === 'image' ? 'image' : payload.message,
    latestMessageTime: new Date(),
    unreadCount,
  };




  sendMessageRelatedInfo(
    'getUnreadChat',
    otherParticipant?._id as string,
    customizedChat
  );

  await Chat.findByIdAndUpdate(
    payload.chatId,
    { latestMessage: result._id, latestMessageTime: new Date() },
    { new: true },
  );

  return populatedResult;
};

const getMessagesByChatId = async (
  user: JwtPayload,
  chatId: string,
  paginationOptions: IPaginationOptions,
) => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const result = await Message.find({ chatId })
    .populate<{ receiverId: { _id: string; name: string; profile: string } }>({
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

  const receiver = result[0].receiverId;

  await Message.updateMany(
    { chatId: chatId, receiverId: user.id, isRead: false },
    { isRead: true },
  );

  sendMessageRelatedInfo(
    'unreadCount',
    receiver?._id,
    {
      unreadCount: 0,
      chatId,
    },
  );
  


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
