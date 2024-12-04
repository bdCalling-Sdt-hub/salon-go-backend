import { model, Schema } from 'mongoose';
import { ICustomer, CustomerModel } from './customer.interface';

const customerSchema = new Schema<ICustomer, CustomerModel>(
  {
    auth: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    // address: {
    //   _id: false,
    //   type: {
    //     street: {
    //       type: String,
    //       required: true,
    //     },
    //     city: {
    //       type: String,
    //       required: true,
    //     },
    //     state: {
    //       type: String,
    //       required: true,
    //     },
    //     zip: {
    //       type: String,
    //       required: true,
    //     },
    //     country: {
    //       type: String,
    //       required: true,
    //     },
    //   },
    // },
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

export const Customer = model<ICustomer, CustomerModel>(
  'Customer',
  customerSchema,
);
