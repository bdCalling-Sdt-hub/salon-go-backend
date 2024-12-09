import { Model, Types } from 'mongoose';

type Point = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

export type ICustomer = {
  auth: Types.ObjectId;
  // address: IAddress;
  address: string;
  location: Point;
  gender: string | 'male' | 'female';
  dob: string;
  profile: string;
  receivePromotionalNotification: boolean;
};

export type CustomerModel = Model<ICustomer>;
