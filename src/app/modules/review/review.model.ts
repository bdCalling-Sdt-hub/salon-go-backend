import { model, Schema } from 'mongoose';
import { IReview, ReviewModel } from './review.interface';

const reviewSchema = new Schema<IReview, ReviewModel>(
  {
    review: {
      type: String,
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
    reservation: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Review = model<IReview, ReviewModel>('Review', reviewSchema);
