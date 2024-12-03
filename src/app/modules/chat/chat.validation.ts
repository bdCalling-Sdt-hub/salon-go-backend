import { Types } from 'mongoose';
import { z } from 'zod';

const accessChatSchema = z.object({
  body: z.object({
    participantId: z.string({ required_error: 'Participant ID is required' }),
  }),
});

export const ChatValidation = {
  accessChatSchema,
};
