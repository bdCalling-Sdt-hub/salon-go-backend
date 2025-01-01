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

const createReservationToDB = async (
  payload: IReservation,
  user: JwtPayload,
) => {
  const { professional, date, time, serviceLocation, amount } = payload;

  const isProfessionalExists = await Professional.findById(
    professional,
  ).populate('auth');

  if (!isProfessionalExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Professional doesn't exist!");
  }

  const { auth, isFreelancer, location, travelFee, teamSize } =
    isProfessionalExists;
  //@ts-ignore
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

  const result = await Reservation.create(payload);

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create reservation');
  }

  await sendNotification('getNotification', user.userId, {
    userId: user.id,
    title: 'Reservation Created',
    message: 'Reservation created successfully',
    type: 'reservation',
  });

  await sendDataWithSocket('reservationCreated', user.id, {
    ...result,
  });

  return result;
};

// const changeReservationStatusToDB = async (
//   id: string,
//   payload: { status: string; amount?: number; isStarted?: boolean },
//   user: JwtPayload,
// ) => {
//   const { status, amount, isStarted } = payload;

//   if (status === 'confirmed' && !amount) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Amount is required');
//   }

//   const updateReservation = async (updateFields: object) => {
//     const result = await Reservation.findOneAndUpdate(
//       { _id: id },
//       updateFields,
//       { new: true },
//     );
//     if (!result) {
//       throw new ApiError(
//         StatusCodes.BAD_REQUEST,
//         'Failed to change reservation status.',
//       );
//     }
//     return result;
//   };

//   if (isStarted) {
//     return await updateReservation({ isStarted });
//   }

//   // Handle simple status updates
//   if (['rejected'].includes(status)) {
//     return await updateReservation({ status });
//   }

//   // Handle confirmed status with additional logic
//   if (status === 'confirmed') {
//     const session = await mongoose.startSession();
//     try {
//       session.startTransaction();

//       const result = await updateReservation({ status, amount });

//       const {
//         professional,
//         serviceStartDateTime,
//         serviceEndDateTime,
//         date,
//         customer,
//       } = result;

//       // Check if the reservation conflicts with existing reservations
//       const conflictingReservation = await Reservation.findOne({
//         professional,
//         status: 'confirmed',
//         serviceStartDateTime: { $lt: serviceEndDateTime },
//         serviceEndDateTime: { $gt: serviceStartDateTime },
//       }).session(session);

//       if (conflictingReservation) {
//         throw new ApiError(
//           StatusCodes.BAD_REQUEST,
//           'This reservation conflicts with an existing confirmed reservation.',
//         );
//       }

//       // Retrieve the schedule
//       const schedule = await Schedule.findOne({
//         professional,
//         'days.day': format(date, 'EEEE'),
//       }).session(session);

//       if (!schedule) {
//         throw new ApiError(StatusCodes.NOT_FOUND, 'Schedule not found');
//       }

//       const isProfessionalExists = await Professional.findById(professional);

//       if (!isProfessionalExists) {
//         throw new ApiError(StatusCodes.NOT_FOUND, 'Professional not found');
//       }

//       // Check if the professional is a freelancer or part of a team
//       const isFreelancer = isProfessionalExists.isFreelancer; // Assuming `isFreelancer` is part of the `Schedule` model
//       const maxTeamSize = isProfessionalExists.teamSize?.max || 0;

//       if (isFreelancer) {
//         // For freelancers, mark the slots as unavailable
//         await Schedule.findOneAndUpdate(
//           {
//             professional,
//             'days.day': format(date, 'EEEE'),
//           },
//           {
//             $set: {
//               'days.$[day].timeSlots.$[slot].isAvailable': false,
//             },
//           },
//           {
//             new: true,
//             session,
//             arrayFilters: [
//               { 'day.day': format(date, 'EEEE') },
//               {
//                 'slot.time': {
//                   $gte: serviceStartDateTime,
//                   $lt: serviceEndDateTime,
//                 },
//               },
//             ],
//           },
//         );
//       } else {
//         // For team-based professionals, check the reservation count
//         const reservationCount = await Reservation.countDocuments({
//           professional,
//           status: 'confirmed',
//           serviceStartDateTime: { $lt: serviceEndDateTime },
//           serviceEndDateTime: { $gt: serviceStartDateTime },
//         }).session(session);

//         if (reservationCount >= maxTeamSize) {
//           // Mark the slots as unavailable if the max team size is reached
//           await Schedule.findOneAndUpdate(
//             {
//               professional,
//               'days.day': format(date, 'EEEE'),
//             },
//             {
//               $set: {
//                 'days.$[day].timeSlots.$[slot].isAvailable': false,
//               },
//             },
//             {
//               new: true,
//               session,
//               arrayFilters: [
//                 { 'day.day': format(date, 'EEEE') },
//                 {
//                   'slot.time': {
//                     $gte: serviceStartDateTime,
//                     $lt: serviceEndDateTime,
//                   },
//                 },
//               ],
//             },
//           );
//         }
//       }

//       await session.commitTransaction();
//       return result;
//     } catch (error) {
//       await session.abortTransaction();
//       throw error;
//     } finally {
//       session.endSession();
//     }
//   }
// };

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

// const confirmReservation = async (
//   id: string,
//   payload: { amount: number },
//   user: JwtPayload,
// ) => {
//   const { amount } = payload;
//   if (!amount) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Amount is required');
//   }

//   const session = await mongoose.startSession();
//   try {
//     session.startTransaction();

//     // Update the reservation status to confirmed
//     const reservation = await Reservation.findOneAndUpdate(
//       { _id: id },
//       { status: 'confirmed', amount },
//       { new: true, session },
//     );

//     if (!reservation) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found');
//     }

//     if (user.userId != reservation.professional) {
//       throw new ApiError(
//         StatusCodes.BAD_REQUEST,
//         'You are not authorized to confirm this reservation',
//       );
//     }

//     const { professional, serviceStartDateTime, serviceEndDateTime, date } =
//       reservation;

//     const start = DateHelper.parseTimeTo24Hour(
//       DateHelper.convertISOTo12HourFormat(serviceStartDateTime + ''),
//     );
//     const end = DateHelper.parseTimeTo24Hour(
//       DateHelper.convertISOTo12HourFormat(serviceEndDateTime + ''),
//     );

//     const professionalData = await Professional.findById(user.userId);
//     if (!professionalData) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Professional not found');
//     }

//     const isFreelancer = professionalData.isFreelancer;
//     const maxTeamSize = professionalData.teamSize?.max || 0;

//     if (isFreelancer) {
//       const conflictingReservation = await Reservation.findOne({
//         professional,
//         status: 'confirmed',
//         serviceStartDateTime: { $lt: serviceEndDateTime },
//         serviceEndDateTime: { $gt: serviceStartDateTime },
//       }).session(session);

//       if (conflictingReservation) {
//         throw new ApiError(
//           StatusCodes.BAD_REQUEST,
//           'This reservation conflicts with an existing confirmed reservation.',
//         );
//       }

//       // Mark slots as unavailable for freelancers

//       await Schedule.findOneAndUpdate(
//         {
//           professional, // Ensure you are targeting the correct professional
//           'days.day': format(date, 'EEEE'), // Format the date correctly
//         },

//         {
//           $set: {
//             'days.$[day].timeSlots.$[slot].isAvailable': false, // Mark the slot as unavailable
//           },
//         },
//         {
//           new: true, // Return the updated document
//           session, // Use the session if you're in a transaction
//           arrayFilters: [
//             { 'days.day': format(date, 'EEEE') }, // Ensure the day matches
//             {
//               'slot.timeCode': {
//                 // Extract time only (HH:mm) for both service start and end time
//                 $gte: start,
//                 $lt: end,
//               },
//             },
//           ],
//         },
//       );
//     } else {
//       // For team-based professionals, check the reservation count
//       const reservationCount = await Reservation.countDocuments({
//         professional,
//         status: 'confirmed',
//         serviceStartDateTime: { $lt: serviceEndDateTime },
//         serviceEndDateTime: { $gt: serviceStartDateTime },
//       }).session(session);

//       if (reservationCount > maxTeamSize) {
//         throw new ApiError(
//           StatusCodes.BAD_REQUEST,
//           'You have conflicting reservations in this time slot.',
//         );
//       }

//       if (reservationCount == maxTeamSize) {
//         await Schedule.findOneAndUpdate(
//           {
//             professional, // Ensure you are targeting the correct professional
//             'days.day': format(date, 'EEEE'), // Format the date correctly
//           },
//           {
//             $set: {
//               'days.$[day].timeSlots.$[slot].isAvailable': false, // Mark the slot as unavailable
//             },
//           },
//           {
//             new: true, // Return the updated document
//             session, // Use the session if you're in a transaction
//             arrayFilters: [
//               { 'day.day': format(date, 'EEEE') }, // Ensure the day matches
//               {
//                 'slot.timeCode': {
//                   // Extract time only (HH:mm) for both service start and end time
//                   $gte: start,
//                   $lt: end,
//                 },
//               },
//             ],
//           },
//         );
//       }
//     }

//     await session.commitTransaction();
//     return reservation;
//   } catch (error) {
//     await session.abortTransaction();
//     throw error;
//   } finally {
//     session.endSession();
//   }
// };

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
    }).session(session);

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
        professional,
        serviceStartDateTime,
        serviceEndDateTime,
        maxTeamSize,
        session,
      );

    if (hasReachedMaxTeamSize) {
      await ReservationHelper.updateTimeSlotAvailability(
        professional,
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

    await sendDataWithSocket('reservationConfirmed', user.id, {
      ...result,
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
    }).session(session);

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
      professional,
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

    await sendDataWithSocket('reservationCanceled', user.id, {
      ...result,
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
  const reservation = await Reservation.findOne({ _id: id });

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
  await sendDataWithSocket('reservationCompleted', user.id, {
    ...result,
  });
  return reservation;
};

const rejectReservation = async (id: string, user: JwtPayload) => {
  //change the reservation status to rejected
  const reservation = await Reservation.findOne({ _id: id });

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

  await sendDataWithSocket('reservationRejected', user.id, {
    ...result,
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
