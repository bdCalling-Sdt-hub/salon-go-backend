import { Model, Types } from 'mongoose';

import { USER_ROLES } from '../../../enums/user';

export type IUser = {
  name: string;
  email: string;
  contact: string;
  password: string;
  role: USER_ROLES;
  status: 'active' | 'restricted' | 'delete';
  verified: boolean;
  termsAndCondition: boolean;
  appId: string;
  authentication?: {
    passwordChangedAt: Date;
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };
};

export type IUserFilters = {
  searchTerm?: string;
  id?: Types.ObjectId;
  email?: string;
  contact?: string;
  role?: USER_ROLES;
  status?: 'active' | 'restricted' | 'delete';
  verified?: boolean;
  termsAndCondition?: boolean;
  needInformation?: boolean;
  appId?: string;
};

export type UserModel = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
