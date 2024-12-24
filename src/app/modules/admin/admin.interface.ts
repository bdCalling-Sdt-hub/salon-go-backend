import { Model, Types } from 'mongoose';
import { IUser } from '../user/user.interface';

export type IAdmin = {
  auth: Types.ObjectId | IUser;
  address: string;
};

export type AdminModel = Model<IAdmin>;
