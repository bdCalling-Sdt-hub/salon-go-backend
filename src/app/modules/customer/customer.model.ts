import { model, Schema } from 'mongoose'
import { ICustomer, CustomerModel } from './customer.interface'

const customerSchema = new Schema<ICustomer, CustomerModel>(
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
    },
    profileImg: {
      type: String,
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
    deliveryOption: {
      type: String,
      enum: ['Leave at the front door', 'Call upon arrival'],
    },
    receivePromotionalNotification: {
      type: Boolean,
      default: false,
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

customerSchema.index({ location: '2dsphere' })

export const Customer = model<ICustomer, CustomerModel>(
  'Customer',
  customerSchema
)
