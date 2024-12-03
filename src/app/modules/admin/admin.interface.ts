import { Model, Types } from 'mongoose';
import { IAuth } from '../auth/auth.interface';

export type IAdmin = {
  auth: Types.ObjectId | IAuth;
};

export type AdminModel = Model<IAdmin>;
