import { SubCategory } from './../categories/categories.model';
import { Model, Types } from 'mongoose';

export type IService = {
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
};

export type ServiceModel = Model<IService>;
