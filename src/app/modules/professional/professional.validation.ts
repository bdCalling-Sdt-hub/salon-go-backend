import { z } from 'zod';

// Reusable address schema
const addressSchema = z.object({
  street: z.string({ required_error: 'Street is required' }),
  apartmentOrSuite: z.string().optional(),
  city: z.string({ required_error: 'City is required' }),
  state: z.string({ required_error: 'State is required' }),
  zip: z.string({ required_error: 'ZIP is required' }),
  country: z.string({ required_error: 'Country is required' }),
});

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

const travelFeeSchema = z.object({
  fee: z.number().min(0, { message: 'Fee must be a positive number' }),
  distance: z
    .number()
    .min(0, { message: 'Distance must be a positive number' }),
});

const teamSizeSchema = z.object({
  min: z.number().min(1, { message: 'Minimum team size must be at least 1' }),
  max: z.number().min(1, { message: 'Maximum team size must be at least 1' }),
});

const locationSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.array(z.number()).length(2, {
    message: 'Coordinates must be an array of exactly two numbers',
  }), // [longitude, latitude]
});

const socialLinksSchema = z.object({
  facebook: z.string().url().optional(),
  instagram: z.string().url().optional(),
  twitter: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  website: z.string().url().optional(),
});

const baseProfessionalBusinessSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    businessName: z.string().optional(),
    targetAudience: z.enum(['men', 'women']).optional(),
    serviceType: z.enum(['home', 'in-place']).optional(),
    travelFee: travelFeeSchema.optional(),
    description: z.string().optional(),
    teamSize: teamSizeSchema.optional(),
    scheduleId: z.string().optional(),
    address: z.string().optional(),
    categories: z.array(z.string()).optional(),
    subCategories: z.array(z.string()).optional(),
    location: locationSchema.optional(),
    license: z.string().optional(),
    socialLinks: socialLinksSchema.optional(),
    helpingTags: z.array(z.string().optional()).optional(),
  }),
});

const updatePortfolioZodSchema = z.object({
  removedImages: z.array(z.string()).optional(),
});

export const partialProfessionalBusinessSchema =
  baseProfessionalBusinessSchema.partial();

export const ProfessionalValidation = {
  baseProfessionalBusinessSchema,
  partialProfessionalBusinessSchema,
  updatePortfolioZodSchema,
};
