import { Schema, model } from 'mongoose';
import { IService, ServiceModel } from './service.interface';

const serviceSchema = new Schema<IService, ServiceModel>(
  {
    title: { type: String, required: true },
    description: { type: String },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
    },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategory: {
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
    discount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

serviceSchema.index({ title: 'text', description: 'text' });

serviceSchema.index({ category: 1 });
serviceSchema.index({ subCategory: 1 });
serviceSchema.index({ subSubCategory: 1 });
serviceSchema.index({
  createdBy: 1,
  category: 1,
  subCategory: 1,
  subSubCategory: 1,
});

export const Service = model<IService, ServiceModel>('Service', serviceSchema);
