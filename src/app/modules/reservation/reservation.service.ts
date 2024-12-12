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

const createReservationToDB = async (
  payload: IReservation,
  user: JwtPayload,
) => {
  const { professional, serviceType, date, time, serviceLocation } = payload;

  const isProfessionalExists = await Professional.findById(
    professional,
  ).populate('auth');

  if (!isProfessionalExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Professional doesn't exist!");
  }

  const { auth, isFreelancer, location, travelFee, teamSize } =
    isProfessionalExists;

  if (auth.status !== 'active') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The requested professional can not be booked right now!',
    );
  }

  if (isFreelancer) {
    const isNotAvailable = await Reservation.exists({
      professional,
      date,
      time,
      status: { $in: ['confirmed'] },
    });

    if (isNotAvailable) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Professional is not available at this time!',
      );
    }

    if (!location || !location.coordinates) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Professional location data is incomplete!',
      );
    }
    const distance = calculateDistance(
      [location.coordinates[0], location.coordinates[1]],
      [serviceLocation.coordinates[0], serviceLocation.coordinates[1]],
    );

    payload.travelFee = travelFee.fee * distance;
  } else {
    const reservationCount = await Reservation.countDocuments({
      professional,
      date,
      time,
      status: { $in: ['confirmed'] },
    });

    if (reservationCount >= (teamSize?.max || 0)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Requested salon does not have any free professional for this time.',
      );
    }
  }
  payload.customer = user.userId;
  const result = await Reservation.create(payload);

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create reservation');
  }

  return result;
};

const getReservationForProfessionalFromDB = async (
  user: JwtPayload,
  filter: IReservationFilterableFields,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const { status, subSubCategory } = filter;

  const query: any = {
    professional: user.userId,
    status: status || 'pending',
  };

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

const updateReservationStatusToDB = async (
  id: string,
  payload: any,
  userId: Types.ObjectId,
) => {
  const isReservationExists = await Reservation.findById(id);
  if (!isReservationExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Reservation not found');
  }
  if (
    isReservationExists.customer !== userId ||
    isReservationExists.professional !== userId
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You are not authorized to update this reservation',
    );
  }
  const result = await Reservation.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update reservation');
  }
  return result;
};

export const ReservationServices = {
  createReservationToDB,
  getReservationForProfessionalFromDB,
  getSingleReservationFromDB,
  updateReservationStatusToDB,
};
