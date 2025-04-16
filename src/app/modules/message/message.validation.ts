import { z } from 'zod';

const sendMessageValidationSchema = z.object({
  message: z.string().min(1, 'Message is required').optional(),
  isRead: z.boolean().default(false),
  image: z.string().optional(),
});

export const MessageValidation = {
  sendMessageValidationSchema,
};
