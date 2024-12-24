import { model, Schema, Types } from 'mongoose';
import { IProfessional, ProfessionalModel } from './professional.interface';

const professionalSchema = new Schema<IProfessional, ProfessionalModel>(
  {
    auth: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    businessName: {
      type: String,
    },
    targetAudience: {
      type: String,
      enum: ['men', 'women'],
    },
    serviceType: {
      type: String,
      enum: ['home', 'in-place'],
    },
    travelFee: {
      _id: false,
      type: {
        fee: {
          type: Number,
        },
        distance: {
          type: Number,
        },
      },
    },

    description: {
      type: String,
    },
    categories: {
      type: [Types.ObjectId],
      ref: 'Category',
    },
    subCategories: {
      type: [Types.ObjectId],
      ref: 'SubCategory',
    },
    isFreelancer: {
      type: Boolean,
      default: false,
    },
    teamSize: {
      _id: false,
      type: {
        min: {
          type: Number,
        },
        max: {
          type: Number,
        },
      },
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Schedule',
    },
    rating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },

    address: {
      type: String,
    },
    location: {
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude] // Default to [0, 0] if coordinates are not provided
    },
    informationCount: {
      type: Number,
      default: 0,
    },
    license: {
      type: String,
    },
    helpingTags: {
      type: [String],
    },
    previouslyUsedTools: {
      type: Boolean,
    },
    portfolio: {
      type: [String],
    },
    socialLinks: {
      _id: false,
      type: {
        facebook: {
          type: String,
        },
        instagram: {
          type: String,
        },
        twitter: {
          type: String,
        },
        linkedin: {
          type: String,
        },
        website: {
          type: String,
        },
      },
    },
  },

  {
    timestamps: true,
  },
);
professionalSchema.index({ location: '2dsphere' });

professionalSchema.index({
  businessName: 'text',
  address: 'text',
  serviceType: 'text',
  targetAudience: 'text',
});

professionalSchema.index({
  auth: 1,
});
export const Professional = model<IProfessional, ProfessionalModel>(
  'Professional',
  professionalSchema,
);
