import { Model, Types } from 'mongoose';

export type ICategory = {
  name: string;
  image: string;
  description: string;
  subCategories: Types.ObjectId[];
};

export type ISubCategory = {
  name: string;
  description: string;
  category: Types.ObjectId;
  subSubCategories: Types.ObjectId[];
};

export type ISubSubCategory = {
  name: string;
  description: string;
  subCategory: Types.ObjectId;
};

export type CategoriesModel = Model<ICategory>;
export type SubCategoriesModel = Model<ISubCategory>;
export type SubSubCategoriesModel = Model<ISubSubCategory>;
