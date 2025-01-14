import { z } from 'zod';

const travelFeeSchema = z.object({
  fee: z.number().min(0, { message: 'Fee must be a positive number' }),
  distance: z
    .number()
    .min(0, { message: 'Distance must be a positive number' }),
});

const updateTravelFeeSchema = z.object({
  fee: z.number().min(0).optional(),
  distance: z.number().min(0).optional(),
});

const teamSizeSchema = z.object({
  min: z.number().min(1, { message: 'Minimum team size must be at least 1' }),
  max: z.number().min(1, { message: 'Maximum team size must be at least 1' }),
});

const updateTeamSizeSchema = z.object({
  min: z.number().min(1).optional(),
  max: z.number().min(1).optional(),
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
    targetAudience: z.enum(['men', 'woman']).optional(),
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
  removedImages: z.string().optional(),
  updatedImage: z.string().optional(),
  link: z.string().optional(),
});

const updateProfessionalProfileZodSchema = z.object({
  businessName: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  experience: z.string().optional(),
  socialLinks: socialLinksSchema.optional(),
});

export const partialProfessionalBusinessSchema =
  baseProfessionalBusinessSchema.partial();

export const ProfessionalValidation = {
  baseProfessionalBusinessSchema,
  partialProfessionalBusinessSchema,
  updatePortfolioZodSchema,
  updateProfessionalProfileZodSchema,
};
