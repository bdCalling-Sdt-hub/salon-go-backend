import { JwtPayload } from 'jsonwebtoken';
import { ISchedule } from './schedule.interface';
import { User } from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Schedule } from './schedule.model';
import mongoose from 'mongoose';
import { Professional } from '../professional/professional.model';

const createScheduleToDB = async (user: JwtPayload, data: ISchedule) => {
  const isUserExist = await User.findById({ _id: user.id, status: 'active' });
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const result = await Schedule.create(
      [
        {
          professional: user.userId,
          days: data.days.map((day) => ({
            ...day,
            timeSlots: day.timeSlots.map((time) => ({
              time: time,
            })),
          })),
        },
      ],
      { session },
    );

    console.log(result);

    await Professional.findOneAndUpdate(
      { auth: user.id },
      { schedule_id: result[0]._id },

      { new: true },
    ).session(session);

    await session.commitTransaction();

    return result;
  } catch (error) {
    await session.abortTransaction();

    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create schedule');
  } finally {
    session.endSession();
  }
};

const updateScheduleForDaysInDB = async (
  user: JwtPayload,
  updates: Partial<ISchedule>,
) => {
  try {
    // Validate the input
    if (!Array.isArray(updates.days)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Invalid input: days should be an array',
      );
    }

    // Find the professional and their existing schedule
    const professional = await Professional.findOne({ auth: user.id });
    if (!professional || !professional.schedule_id) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Professional or schedule not found!',
      );
    }

    // Find the schedule
    const schedule = await Schedule.findById(professional.schedule_id);
    if (!schedule) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Schedule not found!');
    }

    // Update the days in the schedule
    updates.days.forEach((updateDay) => {
      const dayIndex = schedule.days.findIndex((d) => d.day === updateDay.day);
      if (dayIndex === -1) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          `Schedule for ${updateDay.day} not found!`,
        );
      }

      const dayToUpdate = schedule.days[dayIndex];

      // Update startTime and endTime if provided
      if (updateDay.startTime) {
        dayToUpdate.startTime = updateDay.startTime;
      }
      if (updateDay.endTime) {
        dayToUpdate.endTime = updateDay.endTime;
      }

      // Update or replace time slots if provided
      if (updateDay.timeSlots) {
        dayToUpdate.timeSlots = updateDay.timeSlots.map((time) => ({
          time,
          isAvailable: true, // Default value
          discount: null, // Default value
          discountPercentage: 0, // Default value
        }));
      }

      // Replace the day with the updated data
      schedule.days[dayIndex] = dayToUpdate;
    });

    // Save the updated schedule
    const updatedSchedule = await schedule.save();

    return updatedSchedule;
  } catch (error) {
    console.error('Error updating schedule for days:', error);
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update schedule for one or more days',
    );
  }
};

const getTimeScheduleFromDBForProfessional = async (user: JwtPayload) => {
  const professional = await Professional.findOne({ auth: user.id });
  if (!professional || !professional.schedule_id) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Professional or schedule not found!',
    );
  }
  const schedule = await Schedule.findById(professional.schedule_id);
  if (!schedule) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Schedule not found!');
  }
  return schedule;
};

export const ScheduleServices = {
  createScheduleToDB,
  updateScheduleForDaysInDB,
  getTimeScheduleFromDBForProfessional,
};
