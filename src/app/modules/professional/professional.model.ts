import { model, Schema, Types } from 'mongoose';
import { IProfessional, ProfessionalModel } from './professional.interface';

const professionalSchema = new Schema<IProfessional, ProfessionalModel>(
  {
    auth: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    business_name: {
      type: String,
    },
    target_audience: {
      type: String,
      enum: ['men', 'women'],
    },
    services_type: {
      type: String,
      enum: ['home', 'in-place'],
    },
    travel_fee: {
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
    team_size: {
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
    schedule_id: {
      type: Schema.Types.ObjectId,
      ref: 'Schedule',
    },

    // address: {
    //   _id: false,
    //   street: {
    //     type: String,
    //   },
    //   city: {
    //     type: String,
    //   },
    //   state: {
    //     type: String,
    //   },
    //   zip_code: {
    //     type: String,
    //   },
    //   country: {
    //     type: String,
    //   },
    // },
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
    social_links: {
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

export const Professional = model<IProfessional, ProfessionalModel>(
  'Professional',
  professionalSchema,
);
