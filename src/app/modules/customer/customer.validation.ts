import { z } from 'zod';

const updateCustomerProfileZodSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  profile: z.string().optional(),
  address: z.string().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  location: z
    .object({
      coordinates: z
        .array(z.number()) // Array of two numbers (longitude, latitude)
        .length(2) // Ensure the array has exactly two numbers (longitude, latitude)
        .optional(), // The coordinates are optional
    })
    .optional(), // The location object itself is optional
});

export const CustomerValidation = {
  updateCustomerProfileZodSchema,
};
