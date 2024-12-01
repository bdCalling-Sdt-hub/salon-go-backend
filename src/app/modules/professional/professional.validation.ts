import { z } from 'zod'

// Reusable address schema
const addressSchema = z.object({
  street: z.string({ required_error: 'Street is required' }),
  apartmentOrSuite: z.string().optional(),
  city: z.string({ required_error: 'City is required' }),
  state: z.string({ required_error: 'State is required' }),
  zip: z.string({ required_error: 'ZIP is required' }),
  country: z.string().default('United States').optional(),
})

// Social links schema
const socialLinksSchema = z.object({
  facebook: z.string().url('Invalid URL').optional(),
  instagram: z.string().url('Invalid URL').optional(),
  twitter: z.string().url('Invalid URL').optional(),
  linkedin: z.string().url('Invalid URL').optional(),
  website: z.string().url('Invalid URL').optional(),
})

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

// Social links schema
const updateSocialLinksSchema = z.object({
  facebook: z.string().url('Invalid URL').optional(),
  instagram: z.string().url('Invalid URL').optional(),
  twitter: z.string().url('Invalid URL').optional(),
  linkedin: z.string().url('Invalid URL').optional(),
  website: z.string().url('Invalid URL').optional(),
})

const updateProfessionalZodSchema = z.object({
  name: z.string().optional(),
  contact: z.string().optional(),
  profileImg: z.string().optional(),
  address: updateAddressSchema,

  // Business Information
  businessTitle: z.string().optional(),
  businessType: z
    .enum([
      'Party Rentals',
      'Event Planning',
      'Catering',
      'Entertainment',
      'Other',
    ])
    .optional(),

  businessAddress: updateAddressSchema.optional(),
  businessContact: z.string().optional(),
  businessEmail: z.string().email().optional(),
  socialLinks: updateSocialLinksSchema.optional(),
  yearsInBusiness: z.number().optional(),
  isLicensed: z.boolean().default(false),
  license: z.string().optional(),
  description: z.string().optional(),
  availableDays: z
    .array(
      z.enum([
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ])
    )
    .optional(),
  operationStartTime: z.string().optional(),
  operationEndTime: z.string().optional(),

  // Bank Information (Sensitive fields, typically excluded from responses)
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountType: z.string().optional(),
  bankRoutingNumber: z.string().optional(),

  // Signature
  signatureType: z.enum(['Typed', 'Digital']).optional(),
  signature: z.string().optional(),
})

// Main professional schema
const getBusinessInformationFromProfessional = z.object({
  body: z.object({
    address: addressSchema,

    // Business Information
    businessTitle: z.string({ required_error: 'Business title is required' }),
    businessType: z.enum(
      ['Party Rentals', 'Event Planning', 'Catering', 'Entertainment', 'Other'],
      {
        required_error: 'Business type is required',
      }
    ),

    businessAddress: addressSchema.optional(),
    businessContact: z.string().optional(),
    businessEmail: z.string().email('Invalid email address').optional(),
    socialLinks: socialLinksSchema.optional(),
    yearsInBusiness: z.number().optional(),
    isLicensed: z.boolean().default(false),
    license: z.string().optional(),
    description: z.string().optional(),
    availableDays: z
      .array(
        z.enum([
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ])
      )
      .nonempty('At least one day must be selected'),
    operationStartTime: z.string({
      required_error: 'Operation start time is required',
    }),
    operationEndTime: z.string({
      required_error: 'Operation end time is required',
    }),

    // Bank Information (Sensitive fields, typically excluded from responses)
    bankName: z.string().optional(),
    bankAccountName: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankAccountType: z.string().optional(),
    bankRoutingNumber: z.string().optional(),

    // Signature
    signatureType: z.enum(['Typed', 'Digital'], {
      required_error: 'Signature type is required',
    }),
    signature: z.string().optional(),
  }),
})

export const ProfessionalValidation = {
  updateProfessionalZodSchema,
  getBusinessInformationFromProfessional,
}
