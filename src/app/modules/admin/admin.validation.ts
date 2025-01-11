import { z } from 'zod';

const updateAdminZodSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
});

export const AdminValidation = {
  updateAdminZodSchema,
};
