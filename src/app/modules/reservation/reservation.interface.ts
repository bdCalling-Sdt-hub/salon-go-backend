import { Model, Types } from 'mongoose';
type Point = {
  type: 'Point';
  coordinates: [number, number];
};
export type IReservation = {
  service: Types.ObjectId;
  serviceType: string | 'home' | 'in-place';
  professional: Types.ObjectId;
  customer: Types.ObjectId;
  date: Date;
  amount: number;
  time: string;
  status:
    | string
    | 'pending'
    | 'confirmed'
    | 'rejected'
    | 'completed'
    | 'cancelled';
  travelFee: number;
  subSubCategory: Types.ObjectId;
  serviceLocation: Point;
  serviceStartDateTime: Date;
  serviceEndDateTime: Date;
  duration: number;
  isStarted: boolean;
};

export type IReservationFilterableFields = {
  status?: string;
  subSubCategory?: string;
};

export type ReservationModel = Model<IReservation>;
