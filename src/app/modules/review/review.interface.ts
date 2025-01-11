import { Model, Types } from 'mongoose';

export type IReview = {
  _id: Types.ObjectId;
  review: string;
  rating: number;
  professional: Types.ObjectId;
  customer: Types.ObjectId;
  service: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewModel = Model<IReview>;
