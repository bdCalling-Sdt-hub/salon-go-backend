import { Types } from 'mongoose';
import { z } from 'zod';



const accessChatSchema = z.object({
  body: z.object({
    participantId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid participant id.'),
  }),
});

export const ChatValidation = {
  accessChatSchema,
};
