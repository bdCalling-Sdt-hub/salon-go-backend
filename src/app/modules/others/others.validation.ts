import { z } from 'zod';

const createPrivacyPolicyZodSchema = z.object({
  body: z.object({
    content: z.string().min(1, { message: 'Content is required1111' }),
    userType: z.enum(['USER', 'PROFESSIONAL'], {
      required_error: 'User type is required',
    }),
  }),
});

const createTermsAndConditionsZodSchema = z.object({
  body: z.object({
    content: z.string().min(1, { message: 'Content is required' }),
    userType: z.enum(['USER', 'PROFESSIONAL'], {
      required_error: 'User type is required',
    }),
  }),
});

const createFaqsZodSchema = z.object({
  body: z.object({
    content: z.string().min(1, { message: 'Content is required' }),
    userType: z.enum(['USER', 'PROFESSIONAL'], {
      required_error: 'User type is required',
    }),
  }),
});

// Base schema
const createBannerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  link: z.string().url('Link must be a valid URL').optional(),
  isActive: z.boolean().default(true),
  btnText: z.string().optional(),
  createdBy: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId for createdBy'),
});

const updateBannerSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  link: z.string().url().optional(),
  isActive: z.boolean().optional(),
  btnText: z.string().optional(),
});

const createdAboutZodSchema = z.object({
  body: z.object({
    content: z.string().min(1, { message: 'Content is required' }),
    type: z.enum(['ABOUT'], {
      required_error: 'Type is required',
    }),
  }),
});

export const othersValidation = {
  createPrivacyPolicyZodSchema,
  createTermsAndConditionsZodSchema,
  createFaqsZodSchema,
  createBannerSchema,
  updateBannerSchema,
  createdAboutZodSchema,
};
