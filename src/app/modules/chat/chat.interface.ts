import { Model, Types } from 'mongoose';

import { IUser } from '../user/user.interface';

export type IChat = {
  _id: Types.ObjectId;
  participants: [Types.ObjectId | IUser];
  latestMessage: Types.ObjectId;
  latestMessageTime: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatModel = Model<IChat>;
