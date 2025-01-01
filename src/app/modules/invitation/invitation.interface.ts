import { Model, Types } from 'mongoose';

export type IInvitation = {
  _id: Types.ObjectId;
  users: Types.ObjectId[];
  sender: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type InvitationModel = Model<IInvitation>;
