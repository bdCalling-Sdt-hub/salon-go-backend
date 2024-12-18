import { z } from 'zod';

const updateAddressSchema = z
  .object({
    street: z.string().optional(),
    apartmentOrSuite: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().default('United States').optional(),
  })
  .optional();

const updateCustomerProfileZodSchema = z.object({
  name: z.string().optional(),
  profile: z.string().optional(),
  address: updateAddressSchema,
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
