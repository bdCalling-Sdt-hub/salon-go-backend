import { z } from 'zod'

const updateAddressSchema = z
  .object({
    street: z.string().optional(),
    apartmentOrSuite: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().default('United States').optional(),
  })
  .optional()

const updateCustomerProfileZodSchema = z.object({
  name: z.string().optional(),
  contact: z.string().optional(),
  profileImg: z.string().optional(),
  address: updateAddressSchema,
  location: z
    .object({
      type: z.literal('Point'), // Ensure the type is 'Point' (GeoJSON requirement)
      coordinates: z
        .array(z.number()) // Array of two numbers (longitude, latitude)
        .length(2) // Ensure the array has exactly two numbers (longitude, latitude)
        .optional(), // The coordinates are optional
    })
    .optional(), // The location object itself is optional
})

export const CustomerValidation = {
  updateCustomerProfileZodSchema,
}
