import { z } from 'zod';

const createReviewZodSchema = z.object({
  body: z.object({
    review: z.string().min(1, 'Review is required.'),
    rating: z
      .number()
      .min(1, 'Rating must be at least 1.')
      .max(5, 'Rating cannot exceed 5.'),
    professional: z.string({ required_error: 'Professional is required' }),
    service: z.string({ required_error: 'Service is required' }),
  }),
});

export const ReviewValidations = {
  createReviewZodSchema,
};
