import { Model, Types } from 'mongoose';
import { IService } from '../service/service.interface';
import { ICustomer } from '../customer/customer.interface';
import { IProfessional } from '../professional/professional.interface';
type Point = {
  type: 'Point';
  coordinates: [number, number];
};
export type IReservation = {
  _id: Types.ObjectId;
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
    | 'started'
    | 'canceled';
  travelFee: number;
  subSubCategory: Types.ObjectId;
  serviceAddress: string;
  serviceLocation: Point;
  serviceStartDateTime: Date;
  serviceEndDateTime: Date;
  duration: number;
  isStarted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type IReservationFilterableFields = {
  searchTerm?: string;
  status?: string;
  date?: string;
  subSubCategory?: string;
};

export type ReservationModel = Model<IReservation>;

export interface PopulatedReservation
  extends Omit<IReservation, 'service' | 'customer' | 'professional'> {
  service: Pick<IService, '_id' | 'title'>;
  customer: Pick<ICustomer, '_id'>;
  professional: Pick<IProfessional, '_id' | 'businessName'>;
}
