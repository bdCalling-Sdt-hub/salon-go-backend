import { LocationHelper } from './../../../utils/locationHelper';
import { StatusCodes } from 'http-status-codes';
import { Professional } from '../professional/professional.model';
import {
  IReservation,
  IReservationFilterableFields,
} from './reservation.interface';
import ApiError from '../../../errors/ApiError';
import { Schedule } from '../schedule/schedule.model';
import { Reservation } from './reservation.model';
import { ReservationHelper } from './reservation.utils';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { JwtPayload } from 'jsonwebtoken';
import mongoose, { ClientSession, Types } from 'mongoose';
import { DateHelper } from '../../../utils/date.helper';
import { format, isAfter, isBefore } from 'date-fns';
import {
  sendDataWithSocket,
  sendNotification,
} from '../../../helpers/sendNotificationHelper';
import { Customer } from '../customer/customer.model';
import { IUser } from '../user/user.interface';
import { IService } from '../service/service.interface';
import { Service } from '../service/service.model';
import { IProfessional } from '../professional/professional.interface';

const createReservationToDB = async (
  payload: IReservation,
  user: JwtPayload,
) => {
  const { professional, date, time, serviceLocation, amount } = payload;

  const [isProfessionalExists, isCustomerExist, isServiceExist] =
    await Promise.all([
      Professional.findById(professional).populate<{ auth: IUser }>('auth'),
      Customer.findById({ _id: user.userId }).populate<{
        auth: IUser;
      }>('auth', {
        name: 1,
        status: 1,
        profile: 1,
      }),
      Service.findById({ _id: payload.service }, { title: 1 }),
    ]);

  if (isCustomerExist?.auth.status !== 'active') {
    throw new ApiError(StatusCodes.NOT_FOUND, 'You are not allowed to book');
  }

  if (!isProfessionalExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Professional doesn't exist!");
  }

  if (!isServiceExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service doesn't exist!");
  }

  const { auth, isFreelancer, location, travelFee, teamSize } =
    isProfessionalExists;

  if (auth.status !== 'active') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The requested professional cannot be booked right now!',
    );
  }

  const schedule = await Schedule.findOne(
    {
      professional: professional,
      'days.day': format(date, 'EEEE'),
    },
    {
      'days.$': 1,
    },
  );

  if (!schedule) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The requested professional cannot be booked right now!',
    );
  }

  const { days } = schedule;

  const serviceStartDateTime = DateHelper.convertToISODate(time, date);
  const serviceEndDateTime = DateHelper.convertToISODate(
    DateHelper.calculateEndTime(time, payload.duration),
    date,
  );

  const operationStartTime = DateHelper.convertToISODate(
    days[0].startTime,
    date,
  );
  const operationEndTime = DateHelper.convertToISODate(days[0].endTime, date);

  const serviceStart = new Date(serviceStartDateTime);
  const serviceEnd = new Date(serviceEndDateTime);
  const operationStart = new Date(operationStartTime);
  const operationEnd = new Date(operationEndTime);

  if (
    isBefore(serviceStart, operationStart) ||
    isAfter(serviceEnd, operationEnd)
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The requested professional cannot be booked right now!',
    );
  }

  if (isFreelancer) {
    const isNotAvailable = await Reservation.exists({
      professional,
      date,
      status: { $in: ['confirmed'] },
      serviceStartDateTime: { $lt: serviceEndDateTime },
      serviceEndDateTime: { $gt: serviceStartDateTime },
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
    const distance = LocationHelper.calculateDistance(
      [location.coordinates[0], location.coordinates[1]],
      [serviceLocation.coordinates[0], serviceLocation.coordinates[1]],
    );

    payload.travelFee = travelFee.fee * distance;
  } else {
    const reservationCount = await Reservation.countDocuments({
      professional,
      date,
      status: { $in: ['confirmed'] },
      serviceStartDateTime: { $lt: serviceEndDateTime },
      serviceEndDateTime: { $gt: serviceStartDateTime },
    });

    if (reservationCount >= (teamSize?.max || 0)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Requested salon does not have any free professionals for this time.',
      );
    }
  }

  payload.customer = user.userId;
  payload.serviceStartDateTime = serviceStart;
  payload.serviceEndDateTime = serviceEnd;
  payload.amount = amount;

  const result = await Reservation.create([payload]);

  if (!result.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create reservation');
  }

  await sendNotification('getNotification', professional, {
    userId: professional,
    title: `You have a new reservation request from ${isCustomerExist.auth.name}`,
    message: `${isCustomerExist.auth.name} has requested a reservation for ${
      isServiceExist.title
    } on ${serviceStart.toDateString()}. Please check your dashboard for more details.`,
    type: 'reservation',
  });

  await sendDataWithSocket('reservationCreated', user.userId, {
    ...result[0],
  });

  return result[0];
};

const getReservationsForUsersFromDB = async (
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

  return isReservationExists;
};

// Cancel Reservation

const confirmReservation = async (
  id: string,
  payload: { amount: number },
  user: JwtPayload,
) => {
  const { amount } = payload;
  if (!amount) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Amount is required');
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const reservation = await Reservation.findOne({
      _id: id,
      status: 'pending',
    })
      .populate<{ service: IService }>({
        path: 'service',
        select: { title: 1, price: 1, duration: 1 },
      })
      .populate<{ professional: IProfessional }>({
        path: 'professional',
        select: { businessName: 1 },
      })
      .session(session);

    if (!reservation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found');
    }

    if (user.userId !== reservation.professional) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'You are not authorized to confirm this reservation',
      );
    }

    const { professional, serviceStartDateTime, serviceEndDateTime, date } =
      reservation;

    // Convert and parse time for slot updates
    const startTime = DateHelper.parseTimeTo24Hour(
      DateHelper.convertISOTo12HourFormat(serviceStartDateTime.toString()),
    );
    const endTime = DateHelper.parseTimeTo24Hour(
      DateHelper.convertISOTo12HourFormat(serviceEndDateTime.toString()),
    );

    const professionalData = await Professional.findById(user.userId).session(
      session,
    );
    if (!professionalData) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Professional not found');
    }

    const isFreelancer = professionalData.isFreelancer;
    const maxTeamSize = professionalData?.teamSize?.max || 0;

    // Handle freelancer or team-based reservation logic
    const hasReachedMaxTeamSize =
      await ReservationHelper.validateReservationConflicts(
        isFreelancer,
        professional._id,
        serviceStartDateTime,
        serviceEndDateTime,
        maxTeamSize,
        session,
      );

    if (hasReachedMaxTeamSize) {
      await ReservationHelper.updateTimeSlotAvailability(
        professional._id,
        date,
        startTime,
        endTime,
        session,
        false,
      );
    }

    const result = await Reservation.findByIdAndUpdate(
      {
        _id: id,
      },
      { $set: { status: 'confirmed', amount: amount } },
      { new: true, session },
    );

    if (!result) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Failed to confirm reservation',
      );
    }

    await sendDataWithSocket('reservationConfirmed', user.userId, {
      ...result,
    });

    const isCustomerExist = await Customer.findById(result.customer)
      .populate<{ auth: IUser }>({
        path: 'auth',
        select: { name: 1, email: 1, status: 1 },
      })
      .session(session);
    if (!isCustomerExist?.auth.status) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Customer not found');
    }

    await sendNotification('getNotification', reservation.customer, {
      userId: reservation.customer,
      title: `Your reservation for ${reservation.service.title} has been confirmed by ${professional.businessName}.`,
      message: `You have a confirmed reservation for ${
        reservation.service.title
      } on ${date.toDateString()}. Please check your dashboard for more details.`,
      type: 'reservation',
    });

    await session.commitTransaction();
    return reservation;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const cancelReservation = async (id: string, user: JwtPayload) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Fetch the reservation
    const reservation = await Reservation.findOne({
      _id: id,
      status: 'confirmed',
    })
      .populate<{ service: IService }>({
        path: 'service',
        select: { title: 1, price: 1, duration: 1 },
      })
      .populate<{ professional: IProfessional }>({
        path: 'professional',
        select: { businessName: 1, auth: 1 },
      })
      .session(session);

    if (!reservation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found');
    }

    if (
      user.userId !== reservation.professional ||
      user.userId !== reservation.customer
    ) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'You are not authorized to cancel this reservation',
      );
    }

    const { professional, serviceStartDateTime, serviceEndDateTime, date } =
      reservation;

    // Convert and parse time for slot updates
    const startTime = DateHelper.parseTimeTo24Hour(
      DateHelper.convertISOTo12HourFormat(serviceStartDateTime.toString()),
    );
    const endTime = DateHelper.parseTimeTo24Hour(
      DateHelper.convertISOTo12HourFormat(serviceEndDateTime.toString()),
    );

    await ReservationHelper.updateTimeSlotAvailability(
      professional._id,
      date,
      startTime,
      endTime,
      session,
      true,
    );

    const result = await Reservation.findByIdAndUpdate(
      {
        _id: id,
      },
      { $set: { status: 'canceled' } },
      { new: true, session },
    );

    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Failed to cancel reservation');
    }

    await sendDataWithSocket('reservationCanceled', user.userId, {
      ...result,
    });

    await sendNotification('getNotification', reservation.customer, {
      userId: reservation.customer,
      title: `Your reservation for ${reservation.service.title} has been canceled by ${professional.businessName}.`,
      message: `Your reservation for ${
        reservation.service.title
      } on ${date.toDateString()} has been canceled. Please check your dashboard for more details.`,
      type: 'reservation',
    });

    await session.commitTransaction();
    return { message: 'Reservation canceled successfully' };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Reject or Start Reservation
const markReservationAsCompleted = async (id: string, user: JwtPayload) => {
  const reservation = await Reservation.findOne({ _id: id })
    .populate<{
      service: IService;
    }>({
      path: 'service',
      select: { title: 1, duration: 1 },
    })
    .populate<{ professional: IProfessional }>({
      path: 'professional',
      select: { businessName: 1 },
    });

  if (!reservation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found');
  }

  if (user.userId !== reservation.professional) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'You are not authorized to mark this reservation as completed',
    );
  }

  const result = await Reservation.findOneAndUpdate(
    { _id: id },
    { $set: { status: 'completed' } },
    { new: true },
  );
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to mark reservation as completed',
    );
  }
  await sendDataWithSocket('reservationCompleted', user.userId, {
    ...result,
  });

  await sendNotification('getNotification', reservation.customer, {
    userId: reservation.customer,
    title: `Your reservation for ${reservation.service.title} has been marked as completed by ${reservation.professional.businessName}.`,
    message: `Your reservation for ${
      reservation.service.title
    } on ${reservation.date.toDateString()} has been marked as completed. Please check your dashboard for more details.`,
    type: 'reservation',
  });

  return reservation;
};

const rejectReservation = async (id: string, user: JwtPayload) => {
  //change the reservation status to rejected
  const reservation = await Reservation.findOne({ _id: id })
    .populate<{
      service: IService;
    }>({
      path: 'service',
      select: { title: 1, price: 1, duration: 1 },
    })
    .populate<{ professional: IProfessional }>({
      path: 'professional',
      select: { businessName: 1 },
    });

  if (!reservation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found');
  } else if (user.userId !== reservation.professional) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'You are not authorized to reject this reservation',
    );
  }

  const result = await Reservation.findOneAndUpdate(
    { _id: id },
    { $set: { status: 'rejected' } },
    { new: true },
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to reject reservation');
  }

  await sendDataWithSocket('reservationRejected', user.userId, {
    ...result,
  });

  await sendNotification('getNotification', reservation.customer, {
    userId: reservation.customer,
    title: `Your reservation for ${reservation.service.title} has been rejected by ${reservation.professional.businessName}.`,
    message: `Your reservation for ${
      reservation.service.title
    } on ${reservation.date.toDateString()} has been rejected. Please check your dashboard for more details.`,
    type: 'reservation',
  });

  return reservation;
};

export const ReservationServices = {
  createReservationToDB,
  getReservationsForUsersFromDB,
  getSingleReservationFromDB,
  // updateReservationStatusToDB,
  cancelReservation,
  confirmReservation,
  markReservationAsCompleted,
  rejectReservation,
};
