import { Model, Types } from 'mongoose';

import { USER_ROLES } from '../../../enums/user';

export type IUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  contact: string;
  profile: string;
  password: string;
  role: USER_ROLES;
  status: 'active' | 'restricted' | 'delete';
  verified: boolean;
  wrongLoginAttempts: number;
  restrictionLeftAt: Date | null;
  appId: string;
  authentication?: {
    passwordChangedAt: Date;
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type IUserFilters = {
  searchTerm?: string;
  id?: Types.ObjectId;
  email?: string;
  contact?: string;
  role?: USER_ROLES;
  status?: 'active' | 'restricted' | 'delete';
  verified?: boolean;

  appId?: string;
};

export type UserModel = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
