import { Schema, model } from 'mongoose';
import { IService, ServiceModel } from './service.interface';

const serviceSchema = new Schema<IService, ServiceModel>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    SubCategory: {
      type: Schema.Types.ObjectId,
      ref: 'SubCategory',
      required: true,
    },
    subSubCategory: {
      type: Schema.Types.ObjectId,
      ref: 'SubSubCategory',
      required: true,
    },
    duration: { type: Number, required: true },
    price: { type: Number, required: true },
    serviceType: { type: String, enum: ['home', 'in-place'], required: true },
  },
  {
    timestamps: true,
  },
);

export const Service = model<IService, ServiceModel>('Service', serviceSchema);
