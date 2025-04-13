import { Model, Types } from 'mongoose';

export type ICategory = {
  _id: Types.ObjectId;
  name: string;
  image: string;
  description?: string;
  subCategories: Types.ObjectId[];
  type: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ISubCategory = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  image: string;
  subSubCategories: Types.ObjectId[];
  type: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ISubSubCategory = {
  name: string;
  image?: string;
  description?: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  // subCategory: Types.ObjectId;
};

export type CategoriesModel = Model<ICategory>;
export type SubCategoriesModel = Model<ISubCategory>;
export type SubSubCategoriesModel = Model<ISubSubCategory>;
