import { JwtPayload } from 'jsonwebtoken';

import { Chat } from './chat.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

import { get, Types } from 'mongoose';
import { User } from '../user/user.model';

const accessChat = async (
  user: JwtPayload,
  payload: { participantId: string },
) => {
  const participantAuthId = new Types.ObjectId(payload.participantId);
  const requestUserAuthId = new Types.ObjectId(user.id);

  const [isRequestedUserExists, isParticipantExists] = await Promise.all([
    User.findOne({ _id: requestUserAuthId, status: 'active' }),
    User.findOne({ _id: participantAuthId, status: 'active' }),
  ]);

  if (!isRequestedUserExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You are not a valid user!');
  }

  if (!isParticipantExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  let chat = await Chat.findOne({
    participants: { $all: [requestUserAuthId, participantAuthId] },
  }).populate({
    path: 'participants',
    select: { name: 1, profile: 1 },
  });

  if (!chat) {
    await Chat.create({
      participants: [requestUserAuthId, participantAuthId],
    });

    chat = await Chat.findOne({
      participants: { $all: [requestUserAuthId, participantAuthId] },
    }).populate({
      path: 'participants',
      select: { name: 1, profile: 1 },
    });

    if (!chat) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create chat.');
    }
  }

  const participantData = chat.participants.find(
    (participant: any) => participant._id.toString() !== user.id,
  );

  return { chatId: chat._id, ...participantData!.toObject() };
};

const getChatListByUserId = async (user: JwtPayload) => {
  // Find chats where the user is a participant
  const chats = await Chat.find({ participants: { $in: [user.id] } }).populate(
    'participants',
    {
      name: 1,
      profile: 1,
    },
  );

  if (!chats || chats.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get chat list.');
  }

  // Transform chats to only include the other participant's data
  const result = chats.map((chat) => {
    const otherParticipant = chat.participants.find(
      (participant) => participant._id.toString() !== user.id,
    );
    return {
      chatId: chat._id,
      ...otherParticipant!.toObject(),
    };
  });

  return result;
};
export const ChatService = {
  accessChat,
  getChatListByUserId,
};
