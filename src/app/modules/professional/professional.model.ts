import { model, Schema } from 'mongoose'
import { IProfessional, ProfessionalModel } from './professional.interface'

const professionalSchema = new Schema<IProfessional, ProfessionalModel>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    contact: {
      type: String,
      default: '',
    },
    profileImg: {
      type: String,
      default: '',
    },
    address: {
      _id: false,
      type: {
        street: { type: String, required: true },
        apartmentOrSuite: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        country: { type: String, required: true, default: 'United States' },
      },
    },
    rating: {
      type: Number,
      default: 0,
      required: true,
    },
    totalReviews: {
      type: Number,
      default: 0,
      required: true,
    },
    orderCompleted: {
      type: Number,
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },

    //Business Information

    businessTitle: {
      type: String,
    },
    businessType: {
      type: String,
      enum: [
        'Party Rentals',
        'Event Planning',
        'Catering',
        'Entertainment',
        'Other',
      ],
    },

    businessAddress: {
      _id: false,
      type: {
        street: { type: String, required: true },
        apartmentOrSuite: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        country: { type: String, required: true, default: 'United States' },
      },
    },

    businessContact: {
      type: String,
    },
    businessEmail: {
      type: String,
    },
    socialLinks: {
      _id: false,
      type: {
        facebook: { type: String },
        instagram: { type: String },
        twitter: { type: String },
        linkedin: { type: String },
        website: { type: String },
      },
    },
    yearsInBusiness: {
      type: Number,
    },
    isLicensed: {
      type: Boolean,
      default: false,
    },
    license: {
      type: String,
    },
    description: {
      type: String,
    },
    availableDays: {
      type: [String],
    },
    operationStartTime: {
      type: String,
    },
    operationEndTime: {
      type: String,
    },

    //Bank info

    bankName: {
      type: String,
      select: false,
    },
    bankAccountName: {
      type: String,
      select: false,
    },
    bankAccountNumber: {
      type: String,
      select: false,
    },
    bankAccountType: {
      type: String,
      select: false,
    },
    bankRoutingNumber: {
      type: String,
      select: false,
    },

    signatureType: {
      type: String,
      enum: ['Typed', 'Digital'],
    },

    signature: {
      type: String,
    },

    location: {
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude] // Default to [0, 0] if coordinates are not provided
    },
  },
  {
    timestamps: true,
  }
)
professionalSchema.index({ location: '2dsphere' })

export const Professional = model<IProfessional, ProfessionalModel>(
  'Professional'
)
