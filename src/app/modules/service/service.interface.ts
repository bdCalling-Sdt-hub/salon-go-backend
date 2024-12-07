import { SubCategory } from './../categories/categories.model';
import { Model, Types } from 'mongoose';

export type IService = {
  title: string;
  description: string;
  image: string;
  createdBy: Types.ObjectId;
  rating: number;
  totalRatings: number;
  category: Types.ObjectId;
  SubCategory: Types.ObjectId;
  subSubCategory: Types.ObjectId;
  duration: number;
  price: number;
  serviceType: 'home' | 'in-place';
};

export type ServiceModel = Model<IService>;
