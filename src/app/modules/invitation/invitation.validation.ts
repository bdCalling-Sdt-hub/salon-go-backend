import { z } from 'zod';

const sendInvitationZodSchema = z.object({
  body: z.object({
    users: z.string({ required_error: 'User is required' }).array(),
  }),
});

export const InvitationValidations = {
  sendInvitationZodSchema,
};
