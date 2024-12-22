import { model, Schema } from 'mongoose';
import { ICustomer, CustomerModel } from './customer.interface';

const customerSchema = new Schema<ICustomer, CustomerModel>(
  {
    auth: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    address: {
      type: String,
    },
    location: {
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude] // Default to [0, 0] if coordinates are not provided
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
    },
    dob: {
      type: String,
    },
    profile: {
      type: String,
      default: 'https://cdn-icons-png.flaticon.com/512/1253/1253756.png',
    },
    receivePromotionalNotification: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

customerSchema.index({ location: '2dsphere' });

customerSchema.index({ auth: 1 });

export const Customer = model<ICustomer, CustomerModel>(
  'Customer',
  customerSchema,
);
