/* eslint-disable no-undef */
import { JwtPayload } from 'jsonwebtoken';
import { IMessage } from './message.interface';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Chat } from '../chat/chat.model';
import { Message } from './message.model';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { uploadToCloudinary } from '../../../utils/cloudinary';
import sendMessageRelatedInfo from '../../../helpers/socketMessageHelper';
import sharp from 'sharp';

const sendMessage = async (
  user: JwtPayload,
  payload: IMessage,
  chatId: string,
) => {
  // Find chat and receiver in parallel
  const [chat, hasImage] = await Promise.all([
    Chat.findById(chatId)
      .populate<{
        participants: [{ _id: string; name: string; profile: string }];
      }>({
        path: 'participants',
        select: { name: 1, profile: 1 },
      })
      .populate<{ latestMessage: { message: string } }>({
        path: 'latestMessage',
        select: { message: 1 },
      }),
    Promise.resolve(!!payload?.image?.length),
  ]);

  // Check if chat exists
  if (!chat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Chat does not exist.');
  }

  const receiver = chat.participants.find(
    (participant: any) => participant._id.toString() !== user.id,
  );

  if (!receiver) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Receiver does not exist.');
  }

  // Batch payload modifications
  Object.assign(payload, {
    receiverId: receiver._id,
    messageType: hasImage
      ? payload.message?.length
        ? 'both'
        : 'image'
      : 'text',
  });

  // Handle image upload if the message type is 'image' or 'both'
  if (payload.messageType === 'both' || payload.messageType === 'image') {
    if (payload.image && payload.image.length > 0) {
      let resizedImageBuffer;
      try {
        resizedImageBuffer = await sharp(Buffer.from(payload.image, 'base64'))
          .toFormat('jpeg')
          .resize({
            fit: sharp.fit.inside,
            withoutEnlargement: true,
          })
          .jpeg({
            quality: 60,
            mozjpeg: true,
            force: false,
          })
          .withMetadata()
          .toBuffer();
      } catch (error) {
        resizedImageBuffer = Buffer.from(payload.image, 'base64');
      }

      payload.image = resizedImageBuffer.toString('base64');
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

  // Ensure that the latest message is populated with receiver details
  const [populatedResult, unreadCount, updatedChat] = await Promise.all([
    result.populate('receiverId', {
      name: 1,
      profile: 1,
    }),
    Message.countDocuments({ chatId, isRead: false }),
    Chat.findByIdAndUpdate(
      payload.chatId,
      { latestMessage: result._id, latestMessageTime: new Date() },
      { new: true },
    ),
  ]);

  // Send message-related information via socket
  sendMessageRelatedInfo('getMessage', chatId, populatedResult);

  // Ensure other participant details are not null or undefined
  const customizedChat = {
    chatId: chat._id,
    name: receiver?.name || 'Unknown', // Fallback to 'Unknown' if name is missing
    profile: receiver?.profile || 'default-profile-url', // Fallback to default profile if missing
    latestMessage:
      payload.messageType === 'image' ? 'Image' : payload.message || '', // Fallback to 'No message'
    latestMessageTime: new Date(),
    unreadCount,
  };

  // Send updated chat information to the other participant
  sendMessageRelatedInfo(
    'getUnreadChat',
    receiver?._id as string,
    customizedChat,
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
      select: { name: 1, profile: 1, role: 1 },
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

  sendMessageRelatedInfo('unreadCount', receiver?._id, {
    unreadCount: 0,
    chatId,
  });

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
