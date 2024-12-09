import { Model, Types } from 'mongoose';

export type IInvitation = {
  users: Types.ObjectId[];
  sender: Types.ObjectId;
};

export type InvitationModel = Model<IInvitation>;
