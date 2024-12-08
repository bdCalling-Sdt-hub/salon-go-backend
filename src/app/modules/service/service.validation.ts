import { z } from 'zod';

export const createServiceZodSchema = z.object({
  body: z.object({
    title: z.string().nonempty('Title is required.'),
    description: z.string().optional(),
    category: z.string().nonempty('Category is required.'),
    subCategory: z.string().nonempty('SubCategory is required.'),
    subSubCategory: z.string().nonempty('SubSubCategory is required.'),
    duration: z.number().positive('Duration must be a positive number.'),
    price: z.number().positive('Price must be a positive number.'),
    discount: z.number().min(0).max(100).optional(),
  }),
});

export const updateServiceZodSchema = z.object({
  body: z.object({
    title: z.string().nonempty('Title must not be empty.').optional(),
    description: z.string().optional(),
    category: z.string().optional(), // ObjectId as string
    subCategory: z.string().optional(), // ObjectId as string
    subSubCategory: z.string().optional(), // ObjectId as string
    duration: z
      .number()
      .positive('Duration must be a positive number.')
      .optional(),
    price: z.number().positive('Price must be a positive number.').optional(),
    discount: z.number().min(0).max(100).optional(),
  }),
});

export const ServiceValidations = {
  createServiceZodSchema,
  updateServiceZodSchema,
};
