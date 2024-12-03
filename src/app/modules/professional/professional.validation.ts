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

// Social links schema
const socialLinksSchema = z
  .object({
    facebook: z.string().url('Invalid URL').optional(),
    instagram: z.string().url('Invalid URL').optional(),
    twitter: z.string().url('Invalid URL').optional(),
    linkedin: z.string().url('Invalid URL').optional(),
    website: z.string().url('Invalid URL').optional(),
  })
  .optional();

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

const travelFeeSchema = z.object(
  {
    fee: z.number({ required_error: 'Fee is required' }),
    distance: z.number({ required_error: 'Distance is required' }),
  },
  {
    required_error: 'Travel fee is required',
  },
);

const updateTravelFeeSchema = z
  .object({
    fee: z.number().optional(),
    distance: z.number().optional(),
  })
  .optional();

const teamSizeSchema = z.object(
  {
    min: z.number({ required_error: 'Minimum team size is required' }),
    max: z.number({ required_error: 'Maximum team size is required' }),
  },
  {
    required_error: 'Team size is required',
  },
);

const updateTeamSizeSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .optional();

const updateProfessionalProfileZodSchema = z.object({
  business_name: z.string().optional(),
  target_audience: z.array(z.enum(['men', 'women'])).optional(),
  services_type: z.array(z.enum(['home', 'in-place'])).optional(),
  travel_fee: updateTravelFeeSchema,
  description: z.string().optional(),
  categories: z.array(z.string()).optional(),
  team_size: updateTeamSizeSchema,
  schedule_id: z.string().optional(),
  address: updateAddressSchema,
  location: z.object({
    coordinates: z.array(z.number()).length(2), // [longitude, latitude]
  }),
  license: z.string(),
  social_links: socialLinksSchema,
});

const storeProfessionalBusinessZodSchema = z.object({
  body: z.object({
    business_name: z.string({ required_error: 'Business name is required' }),
    target_audience: z.enum(['men', 'women'], {
      required_error: 'Target audience is required',
    }),
    services_type: z.enum(['home', 'in-place'], {
      required_error: 'Services type is required',
    }),
    travel_fee: travelFeeSchema,
    description: z.string({ required_error: 'Description is required' }),
    team_size: teamSizeSchema,
    schedule_id: z.string().optional(),
    // address: addressSchema,
    address: z.string({ required_error: 'Address is required' }),
    categories: z.array(z.string({ required_error: 'Category is required' })),
    subCategories: z.array(
      z.string({ required_error: 'Subcategory is required' }),
    ),
    location: z.object(
      {
        type: z.literal('Point').default('Point'),
        coordinates: z.array(z.number()).length(2), // [longitude, latitude]
      },
      { required_error: 'Location is required' },
    ),
    license: z.string().optional(),
    social_links: socialLinksSchema,
    helping_tags: z.array(z.string().optional()).optional(),
  }),
});

export const ProfessionalValidation = {
  updateProfessionalProfileZodSchema,
  storeProfessionalBusinessZodSchema,
};
