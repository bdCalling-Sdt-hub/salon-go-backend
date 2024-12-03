import { JwtPayload } from 'jsonwebtoken';
import { IChat } from './chat.interface';
import { Chat } from './chat.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import { get, Types } from 'mongoose';
import { Professional } from '../professional/professional.model';
import { Customer } from '../customer/customer.model';

const accessChat = async (
  user: JwtPayload,
  payload: { participantId: string },
) => {
  const { participantId } = payload;

  let getRequestUserId;
  let getParticipantAuthId;

  if (user.role === USER_ROLES.USER) {
    getRequestUserId = await Customer.findById({ _id: user.id }).populate(
      'auth',
      { _id: 1 },
    );

    getParticipantAuthId = await Professional.findById({
      participantId,
    }).populate('auth', { _id: 1 });
  } else if (user.role === USER_ROLES.PROFESSIONAL) {
    getRequestUserId = await Professional.findById({ _id: user.id }).populate(
      'auth',
      { _id: 1 },
    );

    getParticipantAuthId = await Customer.findById({
      participantId,
    }).populate('auth', { _id: 1 });
  }

  if (!getRequestUserId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found!');
  }
  if (!getParticipantAuthId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Professional not found!');
  }

  const isChatExists = await Chat.findOne({
    participants: {
      $all: [getRequestUserId.auth._id, getParticipantAuthId.auth._id],
    },
  });

  if (isChatExists) {
    return isChatExists;
  }

  const result = await Chat.create({
    participants: [getRequestUserId.auth._id, getParticipantAuthId.auth._id],
  });

  console.log(getRequestUserId, 'getRequestUserId');
  console.log(getParticipantAuthId, 'getParticipantAuthId');

  return isChatExists;
};

const getChatListByUserId = async (user: JwtPayload) => {
  const result = await Chat.find({ participants: { $in: [user.id] } }).populate(
    'participants',
    {
      _id: 1,
      name: 1,
      email: 1,
      role: 1,
      status: 1,
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
