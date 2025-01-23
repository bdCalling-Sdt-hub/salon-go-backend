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
import { sendNotification } from '../../../helpers/sendNotificationHelper';
import { USER_ROLES } from '../../../enums/user';
import { Customer } from '../customer/customer.model';
import { ICustomer } from '../customer/customer.interface';
import { Reservation } from '../reservation/reservation.model';
import { IUser } from '../user/user.interface';
import { IService } from '../service/service.interface';

const createReviewToDB = async (user: JwtPayload, payload: IReview) => {
  const session = await mongoose.startSession();
const reservationExists = await Reservation.findById(payload.reservation).session(session);
if (!reservationExists) {
  throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found');
}
  try {
    session.startTransaction();

    // Check existing review
    const existingReview = await Review.findOne({
      customer: user.userId,
      reservation: reservationExists._id,
      professional: reservationExists.professional,
    }).session(session);

    if (existingReview) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Review already exists');
    }

    // Fetch service and professional
    const [service, professional, reservation] = await Promise.all([
      Service.findById(reservationExists.service).session(session),
      Professional.findById(reservationExists.professional)
        .populate('auth', { name: 1 })
        .session(session),
      Reservation.findById(payload.reservation).session(session),
    ]);

    if (!service || !professional || !reservation) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Something went wrong, please try again with valid data',
      );
    }

    // Create review
    payload.customer = user.userId;
    const [result] = await Review.create([{professional: reservationExists.professional, reservation: reservationExists._id, service: reservationExists.service, rating: payload.rating, review: payload.review, customer: user.userId}], { session });

    // Update service rating
    const serviceNewRating = parseFloat(
      (
        (service.rating * service.totalReviews + payload.rating) /
        (service.totalReviews + 1)
      ).toFixed(2),
    );

    // Update professional rating
    const profNewRating = parseFloat(
      (
        ((professional.rating || 0) * (professional.totalReviews || 0) +
          payload.rating) /
        ((professional.totalReviews || 0) + 1)
      ).toFixed(2),
    );

    // Update both in parallel
    await Promise.all([
      Service.findByIdAndUpdate(
        service._id,
        {
          $inc: { totalReviews: 1 },
          $set: { rating: serviceNewRating },
        },
        { session },
      ),
      Professional.findByIdAndUpdate(
        professional._id,
        {
          $inc: { totalReviews: 1 },
          $set: { rating: profNewRating },
        },
        { session },
      ),
      Reservation.findByIdAndUpdate(
        payload.reservation,
        {
          $set: { review: result._id },
        },
        { session },
      ),
    ]);

    // Get populated review
    const finalReview = await Review.findById(result._id)
      .populate<{ service: IService }>('service', { title: 1 })
      .populate({
        path: 'professional',
        select: { auth: 1 },
        populate: {
          path: 'auth',
          select: { name: 1 },
        },
      })
      .populate<{ customer: { auth: IUser } }>({
        path: 'customer',
        select: { auth: 1 },
        populate: {
          path: 'auth',
          select: { name: 1 },
        },
      })
      .session(session);

    if (!finalReview) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to create review',
      );
    }

    // Send notification
    if (professional.auth) {
      await sendNotification('getNotification', professional._id, {
        title: `${finalReview.customer.auth.name} gives you ${payload.rating} star review for ${finalReview.service.title}`,
        message: payload.review || '',
        type: USER_ROLES.PROFESSIONAL,
        userId: professional.auth._id,
      });
    }

    await session.commitTransaction();
    return finalReview;
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(
      error instanceof ApiError
        ? error.statusCode
        : StatusCodes.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : 'Failed to create review',
    );
  } finally {
    await session.endSession();
  }
};

const getReviews = async (
  user: JwtPayload,
  paginationOptions: IPaginationOptions,
) => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const query =
    user.role === 'customer'
      ? { customer: user.userId }
      : user.role === 'professional'
      ? { professional: user.userId }
      : {};

  const result = await Review.find(query)
    .populate({
      path: 'service',
      select: {
        _id: 0,
        title: 1,
      },
    })
    .populate({
      path: 'professional',
      select: {
        _id: 1,
      },
      populate: {
        path: 'auth',
        select: {
          _id: 0,
          name: 1,
        },
      },
    })
    .populate({
      path: 'customer',
      select: {
        _id: 1,
      },
      populate: {
        path: 'auth',
        select: {
          _id: 0,
          name: 1,
        },
      },
    })
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get reviews');
  }
  const total = await Review.countDocuments(query);
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

    if (!service && !professional) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete review');
    }
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
          ((professional.rating ?? 0) * (professional.totalReviews ?? 0) -
            result.rating) /
          ((professional.totalReviews ?? 0) - 1)
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
  getReviews,
  deleteReviewFromDB,
};
