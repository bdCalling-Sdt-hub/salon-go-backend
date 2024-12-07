import { Schema, model } from 'mongoose';
import { IReview, ReviewModel } from './review.interface'; 

const reviewSchema = new Schema<IReview, ReviewModel>({
  // Define schema fields here
});

export const Review = model<IReview, ReviewModel>('Review', reviewSchema);
