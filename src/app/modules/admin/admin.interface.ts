import { Model } from 'mongoose';

export type IAdmin = {
  name: string;
};

export type AdminModel = Model<IAdmin>;
