import { z } from 'zod';

const createReviewZodSchema = z.object({
  body: z.object({
    review: z.string().min(1, 'Review is required.').optional(),
    rating: z.number().max(5, 'Rating cannot exceed 5.'),
    reservation: z.string({ required_error: 'Reservation is required' }),
  }),
});

export const ReviewValidations = {
  createReviewZodSchema,
};
