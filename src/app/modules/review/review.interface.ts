import { Model, Types } from 'mongoose';

export type IReview = {
  review: string;
  rating: number;
  professional: Types.ObjectId;
  customer: Types.ObjectId;
  service: Types.ObjectId;
};

export type ReviewModel = Model<IReview>;
