import { Model, Types } from 'mongoose';

type Point = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

export type ICustomer = {
  _id: Types.ObjectId;
  auth: Types.ObjectId;
  address: string;
  location: Point;
  gender: string | 'male' | 'female';
  dob: string;
  receivePromotionalNotification: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerModel = Model<ICustomer>;
