import { Schema, model } from 'mongoose';
import {
  CategoriesModel,
  ICategory,
  ISubCategory,
  ISubSubCategory,
  SubCategoriesModel,
  SubSubCategoriesModel,
} from './categories.interface';

const categorySchema = new Schema<ICategory, CategoriesModel>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
      required: true,
    },
    subCategories: {
      type: [Schema.Types.ObjectId],
      ref: 'SubCategory',
    },
  },
  {
    timestamps: true,
  },
);

const subCategorySchema = new Schema<ISubCategory, SubCategoriesModel>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
      required: true,
    },
    subSubCategories: {
      type: [Schema.Types.ObjectId],
      ref: 'SubSubCategory',
    },
  },

  {
    timestamps: true,
  },
);

const subSubCategorySchema = new Schema<ISubSubCategory, SubSubCategoriesModel>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const Category = model<ICategory, CategoriesModel>(
  'Category',
  categorySchema,
);
export const SubCategory = model<ISubCategory, SubCategoriesModel>(
  'SubCategory',
  subCategorySchema,
);

export const SubSubCategory = model<ISubSubCategory, SubSubCategoriesModel>(
  'SubSubCategory',
  subSubCategorySchema,
);
