import { Model, Types } from 'mongoose';
type Point = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};
export type IReservation = {
  service: Types.ObjectId;
  serviceType: string | 'home' | 'in-place';
  professional: Types.ObjectId;
  customer: Types.ObjectId;
  date: Date;
  time: string;
  status: string | 'pending' | 'confirmed' | 'rejected' | 'completed';
  travelFee: number;
  subSubCategory: Types.ObjectId;
  serviceLocation: Point;
};

export type IReservationFilterableFields = {
  status?: string;
  subSubCategory?: string;
};

export type ReservationModel = Model<IReservation>;
