import { SubCategory } from './../categories/categories.model';
import { Model, Types } from 'mongoose';

export type IService = {
  _id: Types.ObjectId;
  title: string;
  description: string;
  createdBy: Types.ObjectId;
  rating: number;
  totalReviews: number;
  category: Types.ObjectId;
  subCategory: Types.ObjectId;
  subSubCategory: Types.ObjectId;
  duration: number;
  price: number;
  discount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceModel = Model<IService>;
