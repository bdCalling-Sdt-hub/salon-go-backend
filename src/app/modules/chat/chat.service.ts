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

  let getRequestUserAuthId = user.id;

  const [isRequestedUserExists, isParticipantExists] = await Promise.all([
    User.findById({ _id: getRequestUserAuthId, status: 'active' }),
    User.findById({ _id: participantAuthId, status: 'active' }),
  ]);

  if (!isRequestedUserExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You are not a valid user!');
  }

  if (!isParticipantExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  const isChatExists = await Chat.findOne({
    participants: {
      $all: [getRequestUserAuthId, participantAuthId],
    },
  }).populate('participants', {
    name: 1,

    role: 1,
  });

  if (isChatExists) {
    return isChatExists;
  }

  const result = await Chat.create({
    participants: [getRequestUserAuthId, participantAuthId],
  });

  const newChat = await Chat.findOne({
    participants: {
      $all: [getRequestUserAuthId, participantAuthId],
    },
  }).populate('participants', {
    name: 1,

    role: 1,
  });

  if (!newChat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create chat.');
  }

  return newChat;
};

const getChatListByUserId = async (user: JwtPayload) => {
  const result = await Chat.find({ participants: { $in: [user.id] } }).populate(
    'participants',
    {
      name: 1,

      role: 1,
    },
  );
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get chat list.');
  }
  return result;
};

export const ChatService = {
  accessChat,
  getChatListByUserId,
};
