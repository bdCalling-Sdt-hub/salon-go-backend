import { model, Schema } from 'mongoose';
import { IReview, ReviewModel } from './review.interface';

const reviewSchema = new Schema<IReview, ReviewModel>(
  {
    review: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
    },
    professional: {
      type: Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    service: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
  },
);

export const Review = model<IReview, ReviewModel>('Review', reviewSchema);
