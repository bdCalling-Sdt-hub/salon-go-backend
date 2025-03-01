import { ClientSession, Types } from 'mongoose';
import { Schedule } from '../schedule/schedule.model';
import { format } from 'date-fns';
import { Reservation } from './reservation.model';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';

const validateReservationConflicts = async (
  isFreelancer: boolean,
  professional: Types.ObjectId,
  serviceStartDateTime: Date,
  serviceEndDateTime: Date,
  maxTeamSize: number,
  session: ClientSession,
) => {
  if (isFreelancer) {
    const conflict = await Reservation.findOne({
      professional,
      status: 'confirmed',
      serviceStartDateTime: { $lt: serviceEndDateTime },
      serviceEndDateTime: { $gt: serviceStartDateTime },
    }).session(session);

    if (conflict) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You have conflicting reservations in this time slot.',
      );
    }
    return true;
  } else {
    const reservationCount = await Reservation.countDocuments({
      professional,
      status: 'confirmed',
      serviceStartDateTime: { $lt: serviceEndDateTime },
      serviceEndDateTime: { $gt: serviceStartDateTime },
    }).session(session);

    if (reservationCount >= maxTeamSize) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You have conflicting reservations in this time slot.',
      );
    }

    return reservationCount + 1 >= maxTeamSize;
  }
};

const updateTimeSlotAvailability = async (
  professional: Types.ObjectId,
  date: Date,
  startTime: number,
  endTime: number,
  session?: ClientSession,
  status?: boolean,
) => {
  await Schedule.findOneAndUpdate(
    {
      professional,
      'days.day': format(date, 'EEEE'),
    },
    {
      $set: {
        'days.$[day].timeSlots.$[slot].isAvailable': status,
      },
    },
    {
      new: true,
      ...(session && { session }),
      arrayFilters: [
        { 'day.day': format(date, 'EEEE') },
        {
          'slot.timeCode': {
            $gte: startTime,
            $lt: endTime,
          },
        },
      ],
    },
  );
};


const getReservationFormattedData = async (reservation:Types.ObjectId) => {
  const formattedReservation = await Reservation.findById(reservation._id)
  .select({
    _id: 1,
    amount: 1,
    date: 1,
    status: 1,
    travelFee: 1,
    serviceStartDateTime: 1,
    serviceEndDateTime: 1,
    serviceType: 1,
    isStarted: 1,
    duration: 1,
    serviceLocation: 1,
    address: 1,
  })
  .populate('review', {
    _id: 0,
    rating: 1,
  })
  .populate({
    path: 'service',
    select: {
      _id: 0,
      title: 1,
    },
    populate: {
      path: 'category',
      select: {
        _id: 0,
        name: 1,
      },
    },
  })
  .populate('subSubCategory', {
    _id: 0,
    name: 1,
  })
  .populate<{ professional: {_id:Types.ObjectId, businessName: string, address: string, location: string,  auth: { _id: Types.ObjectId, deviceId: string } }}>('professional', {
    _id: 1,
    businessName: 1,
    address: 1,
    location: 1,
    auth:1,
    populate: {
      path: 'auth',
      select: { _id:1,deviceId: 1 },
    },
  })
  .populate<{ customer: {_id:Types.ObjectId, auth: {_id:Types.ObjectId, name: string; address: string; profile: string; contact: string; deviceId: string } } }>({
    path: 'customer',
    select: { auth: 1 },
    populate: {
      path: 'auth',
      select: { _id:1, name: 1, address: 1, profile: 1, contact: 1, deviceId: 1 },
    },
  })
  .lean();

  return formattedReservation;
}

export const ReservationHelper = {
  validateReservationConflicts,
  updateTimeSlotAvailability,
  getReservationFormattedData
};
