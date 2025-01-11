import mongoose from 'mongoose';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

const createSubCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  // category: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId'),
});

const createSubSubCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
  }),
});

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
});

const updateSubCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
});

const updateSubSubCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
});

// Zod schema for adding subSubCategories to a subCategory
const addSubCategoryToCategoryZodSchema = z.object({
  body: z.object({
    subCategories: z
      .array(
        z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: 'Invalid subSubCategory ID',
        }),
      )
      .min(1, { message: 'At least one subSubCategory ID is required' }),
  }),
});

const removeSubCategoryFromCategoryZodSchema = z.object({
  body: z.object({
    subCategories: z
      .array(
        z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: 'Invalid subSubCategory ID',
        }),
      )
      .min(1, { message: 'At least one subSubCategory ID is required' }),
  }),
});

const addSubSubCategoryToSubCategoryZodSchema = z.object({
  body: z.object({
    subSubCategories: z
      .array(
        z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: 'Invalid subSubCategory ID',
        }),
      )
      .min(1, { message: 'At least one subSubCategory ID is required' }),
  }),
});

const removeSubSubCategoryFromSubCategoryZodSchema = z.object({
  body: z.object({
    subSubCategories: z
      .array(
        z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: 'Invalid subSubCategory ID',
        }),
      )
      .min(1, { message: 'At least one subSubCategory ID is required' }),
  }),
});

export const CategoriesValidations = {
  createCategorySchema,
  createSubCategorySchema,
  createSubSubCategorySchema,
  updateCategorySchema,
  updateSubCategorySchema,
  updateSubSubCategorySchema,

  //add or remove sub category and sub sub category
  addSubCategoryToCategoryZodSchema,
  removeSubCategoryFromCategoryZodSchema,
  addSubSubCategoryToSubCategoryZodSchema,
  removeSubSubCategoryFromSubCategoryZodSchema,
};
