import { Model, Types } from 'mongoose';
import { IUser } from '../user/user.interface';

export type IAdmin = {
  _id: Types.ObjectId;
  auth: Types.ObjectId | IUser;
  address: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminModel = Model<IAdmin>;
