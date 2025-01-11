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
  session: ClientSession,
  status: boolean,
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
      session,
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

export const ReservationHelper = {
  validateReservationConflicts,
  updateTimeSlotAvailability,
};
