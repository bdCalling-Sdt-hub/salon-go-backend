import { JwtPayload } from 'jsonwebtoken';

import { Chat } from './chat.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

import { get, Types } from 'mongoose';
import { User } from '../user/user.model';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IMessage } from '../message/message.interface';
import { IChat } from './chat.interface';
import { Message } from '../message/message.model';

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
  })
    .populate({
      path: 'participants',
      select: { name: 1, profile: 1 },
    })
    .populate({
      path: 'latestMessage',
      select: { message: 1 },
    })
    .lean();

  if (!chat) {
    await Chat.create({
      participants: [requestUserAuthId, participantAuthId],
    });

    chat = await Chat.findOne({
      participants: { $all: [requestUserAuthId, participantAuthId] },
    })
      .populate({
        path: 'participants',
        select: { name: 1, profile: 1 },
      })
      .populate({
        path: 'latestMessage',
        select: { message: 1 },
      })
      .lean();

    
 

    if (!chat) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create chat.');
    }
  }

  const participantData = chat.participants.find(
    (participant: any) => participant._id.toString() !== user.id,
  );

  const latestMessageData = (chat.latestMessage as Partial<IMessage>) || {};
  const message = latestMessageData.message || ''; // Default to an empty string
  const { latestMessageTime } = chat;

  //mark as read
  await Message.updateMany(
    { chatId: chat._id, isRead: false, receiverId: new Types.ObjectId(user.id) },
    { isRead: true },
  );

  const returnData ={
    chatId: chat._id,
    ...participantData,
    latestMessage: message ?? null,
    latestMessageTime: latestMessageTime,
    unreadCount:0
  }
   //send newly created chat to the user
    //@ts-ignore
    const socket = global.io;
  socket.emit(`accessChat::${user.userId}`, returnData);


  return returnData;
};

const getChatListByUserId = async (
  user: JwtPayload,
  paginationOptions: IPaginationOptions,
  searchTerm?: string,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  // Define the base query
  const baseQuery = {
    participants: { $in: [user.id] },
  };

  // Fetch chats with base query and pagination
  const chats = await Chat.find(baseQuery)
    .populate({
      path: 'participants',
      select: { name: 1, profile: 1 },
    })
    .populate({
      path: 'latestMessage',
      select: {
        message: 1,
      },
    })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();


  if (!chats || chats.length === 0) {
    return {
      meta: {
        page,
        limit,
        total: 0,
        totalPage: 0,
      },
      data: [],
    };
  }

  // Filter chats based on the search term
  const filteredChats = chats.filter((chat) =>
    searchTerm
      ? chat.participants.some(
          (participant) =>
            'name' in participant &&
            participant.name.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : true,
  );

  // Transform chats to only include the other participant's data
  const result = filteredChats.map((chat) => {
    const otherParticipant = chat.participants.find(
      (participant) => participant._id.toString() !== user.id,
    );

    const latestMessageData = (chat.latestMessage as Partial<IMessage>) || {};
    const message = latestMessageData.message || ''; // Default to an empty string
    const { latestMessageTime } = chat;

    return {
      chatId: chat._id,
      ...otherParticipant,
      latestMessage: message ?? null,
      latestMessageTime: latestMessageTime,
    };
  });

   // Recalculate the total based on the search filter
   const total = await Chat.find(baseQuery)
   .populate('participants', { name: 1, profile: 1 })
   .lean()
   .then(
     (allChats) =>
       allChats.filter((chat) =>
         searchTerm
           ? chat.participants.some(
               (participant) =>
                 'name' in participant &&
                 participant.name
                   .toLowerCase()
                   .includes(searchTerm.toLowerCase()),
             )
           : true,
       ).length,
   );

 // Count unread messages for each chat and add the count to each chat
 const chatIds = result.map((chat) => chat.chatId);

 const unreadCounts = await Message.aggregate([
   {
     $match: {
       chatId: { $in: chatIds },
       receiverId: new Types.ObjectId(user.id),
       isRead: false,
     },
   },
   {
     $group: {
       _id: '$chatId',
       count: { $sum: 1 },
     },
   },
 ]);


 // Create a map of chatId to unread message count
 const unreadCountMap = new Map(
   unreadCounts.map((item) => [item._id.toString(), item.count]),
 );

 // Append unread message count to each chat
 const resultWithUnreadCount = result.map((chat) => ({
   ...chat,
   unreadCount: unreadCountMap.get(chat.chatId.toString()) || 0,
 }));

  return {
    meta: {
      page,
      limit,
      total: total,
      totalPage: Math.ceil(total / limit),
    },
    data: resultWithUnreadCount,
};
}
export const ChatService = {
  accessChat,
  getChatListByUserId,
};
