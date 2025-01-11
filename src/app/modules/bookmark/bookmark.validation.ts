import { z } from 'zod';

const addOrRemoveBookMarkZodSchema = z.object({
  body: z.object({
    professional: z.string({
      required_error: 'Professional ID is required',
    }),
  }),
});

export const BookmarkValidation = {
  addOrRemoveBookMarkZodSchema,
};
