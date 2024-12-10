import { StatusCodes } from 'http-status-codes';
import { Professional } from '../professional/professional.model';
import {
  IReservation,
  IReservationFilterableFields,
} from './reservation.interface';
import ApiError from '../../../errors/ApiError';
import { Schedule } from '../schedule/schedule.model';
import { Reservation } from './reservation.model';
import { Customer } from '../customer/customer.model';
import { calculateDistance } from './reservation.utils';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';

const createReservationToDB = async (payload: IReservation) => {
  const { professional } = payload;

  const isProfessionalExists = await Professional.findById(
    professional,
  ).populate('auth');

  if (!isProfessionalExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Professional doesn't exist!");
  }

  if (isProfessionalExists.auth.status !== 'active') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Professional is not active!');
  }

  //For freelancer
  if (isProfessionalExists.isFreelancer) {
    const isAvailable = await Reservation.findOne({
      professional: isProfessionalExists._id,
      date: payload.date,
      time: payload.time,
      status: { $in: ['pending', 'rejected', 'completed'] },
    });
    if (!isAvailable) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Professional is not available at this time!',
      );
    }

    if (payload.serviceType === 'home') {
      const distance = calculateDistance(
        [
          isProfessionalExists.location.coordinates[0],
          isProfessionalExists.location.coordinates[1],
        ],
        [
          payload.serviceLocation.coordinates[0],
          payload.serviceLocation.coordinates[1],
        ],
      );
      const travelFee = isProfessionalExists.travelFee.fee * distance;
      payload.travelFee = travelFee;
    }

    const result = await Reservation.create(payload);
    if (!result) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to create reservation',
      );
    }
    return result;
  }

  //For business
  if (!isProfessionalExists.isFreelancer) {
    const countReservationForGivenDateAndTime =
      await Reservation.countDocuments({
        professional: isProfessionalExists._id,
        date: payload.date,
        time: payload.time,
        status: { $in: ['confirmed'] },
      });

    if (
      countReservationForGivenDateAndTime >= isProfessionalExists.teamSize.max
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Requested salon does not have any free professional for this time.',
      );
    }

    const result = await Reservation.create(payload);
    if (!result) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to create reservation',
      );
    }
    return result;
  }
};

const getReservationForProfessionalFromDB = async (
  user: JwtPayload,
  filter: IReservationFilterableFields,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const { status, subSubCategory } = filter;

  // Building the query object
  const query: any = {
    professional: user.userId,
    status: status || 'pending',
  };

  // Only include subSubCategory in the query if it's provided
  if (subSubCategory) {
    query.subSubCategory = subSubCategory;
  }

  const result = await Reservation.find(query)
    .populate({
      path: 'customer',
      select: { auth: 1 },
      populate: { path: 'auth', select: { name: 1, email: 1 } },
    })
    .populate({
      path: 'professional',
      select: { auth: 1 },
      populate: { path: 'auth', select: { name: 1, email: 1 } },
    })
    .populate('service', {
      title: 1,
      price: 1,
      duration: 1,
    })
    .populate('subSubCategory', {
      name: 1,
    })
    .sort({
      [sortBy]: sortOrder,
    })
    .skip(skip)
    .limit(limit);

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get reservation');
  }

  const total = await Reservation.countDocuments({
    professional: user.userId,
    status: status || 'pending',
    subSubCategory: subSubCategory || null,
  });

  return {
    meta: {
      page,
      limit,
      total: total,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

const getSingleReservationFromDB = async (
  id: string,
  userId: Types.ObjectId,
) => {
  const isReservationExists = await Reservation.findById(id);
  if (!isReservationExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Reservation not found');
  }

  if (
    isReservationExists.professional !== userId ||
    isReservationExists.customer !== userId
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You are not authorized to view this reservation',
    );
  }

  return isReservationExists;
};

export const ReservationServices = {
  createReservationToDB,
  getReservationForProfessionalFromDB,
  getSingleReservationFromDB,
};
