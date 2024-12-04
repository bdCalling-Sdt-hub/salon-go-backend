import { z } from 'zod';

const sendMessageValidationSchema = z.object({
  receiverId: z.string().min(24, 'receiverId must be a valid ObjectId'),
  message: z.string().min(1, 'Message is required').optional(),
  isRead: z.boolean().default(false),
  image: z.string().optional(),
});

export const MessageValidation = {
  sendMessageValidationSchema,
};
