import mongoose from 'mongoose';
import { IReview } from './review.interface';
import { Review } from './review.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Service } from '../service/service.model';
import { Professional } from '../professional/professional.model';
import { JwtPayload } from 'jsonwebtoken';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';

const createReviewToDB = async (user: JwtPayload, payload: IReview) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    payload.customer = user.userId;
    const [result] = await Review.create([payload], { session });

    const [service, professional] = await Promise.all([
      Service.findById(payload.service, null, { session }),
      Professional.findById(payload.professional, null, { session }),
    ]);

    const updatePromises = [];

    if (service) {
      const newAverageRating = parseFloat(
        (
          (service.rating * service.totalReviews + payload.rating) /
          (service.totalReviews + 1)
        ).toFixed(2),
      );
      console.log(newAverageRating, 'Service');
      updatePromises.push(
        Service.findByIdAndUpdate(
          payload.service,
          {
            $inc: { totalReviews: 1 },
            $set: { rating: newAverageRating },
          },
          { session },
        ),
      );
    }

    if (professional) {
      const newAverageRating = parseFloat(
        (
          (professional.rating * professional.totalReviews + payload.rating) /
          (professional.totalReviews + 1)
        ).toFixed(2),
      );
      console.log(newAverageRating, 'Professional');
      updatePromises.push(
        Professional.findByIdAndUpdate(
          payload.professional,
          {
            $inc: { total_reviews: 1 },
            $set: { rating: newAverageRating },
          },
          { session },
        ),
      );
    }

    await Promise.all(updatePromises);

    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create review');
  } finally {
    session.endSession();
  }
};

const getReviewsByProfessionalIdFromDB = async (
  professionalId: string,
  paginationOptions: IPaginationOptions,
) => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const result = await Review.find({ professional: professionalId })
    .populate('customer')
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get reviews');
  }
  const total = await Review.countDocuments({ professional: professionalId });
  return {
    meta: {
      total,
      page,
      totalPage: Math.ceil(total / limit),
      limit,
    },
    data: result,
  };
};

const deleteReviewFromDB = async (id: string) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await Review.findByIdAndDelete(id);
    if (!result) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete review');
    }

    //make the necessary changes to professional and service

    const [service, professional] = await Promise.all([
      Service.findById(result.service),
      Professional.findById(result.professional),
    ]);

    if (service) {
      const newAverageRating = parseFloat(
        (
          (service.rating * service.totalReviews - result.rating) /
          (service.totalReviews - 1)
        ).toFixed(2),
      );
      await Service.findByIdAndUpdate(
        result.service,
        {
          $inc: { totalReviews: -1 },
          $set: { rating: newAverageRating },
        },
        { new: true },
      );
    }

    if (professional) {
      const newAverageRating = parseFloat(
        (
          (professional.rating * professional.totalReviews - result.rating) /
          (professional.totalReviews - 1)
        ).toFixed(2),
      );
      await Professional.findByIdAndUpdate(
        result.professional,
        {
          $inc: { total_reviews: -1 },
          $set: { rating: newAverageRating },
        },
        { new: true },
      );
    }

    await session.commitTransaction();

    return result;
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete review');
  } finally {
    session.endSession();
  }
};

export const ReviewService = {
  createReviewToDB,
  getReviewsByProfessionalIdFromDB,
  deleteReviewFromDB,
};
