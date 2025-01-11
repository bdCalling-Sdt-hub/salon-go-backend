import { JwtPayload } from 'jsonwebtoken';
import { ISchedule } from './schedule.interface';
import { User } from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Schedule } from './schedule.model';
import { Professional } from '../professional/professional.model';
import { DateHelper } from '../../../utils/date.helper';

const createScheduleToDB = async (user: JwtPayload, data: ISchedule) => {
  const isUserExist = await User.findById({ _id: user.id, status: 'active' });
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  try {
    const result = await Schedule.create({
      professional: user.userId,
      days: data.days.map((day) => ({
        ...day,
        timeSlots: day.timeSlots.map((time) => {
          //@ts-ignore
          const timeCode = DateHelper.parseTimeTo24Hour(time); // Adjusted for plain string `time`
          return {
            time: time, // Original time in 12-hour format
            timeCode: timeCode, // ISO 24-hour format
          };
        }),
      })),
    });

    // Update the professional's scheduleId
    await Professional.findOneAndUpdate(
      { _id: user.userId },
      { scheduleId: result._id },
      { new: true },
    );

    return result;
  } catch (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create schedule');
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
    const professional = await Professional.findOne({ _id: user.userId });
    if (!professional || !professional.scheduleId) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Professional or schedule not found!',
      );
    }

    // Find the schedule
    const schedule = await Schedule.findById(professional.scheduleId);
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

      if (updateDay.timeSlots) {
        dayToUpdate.timeSlots = updateDay.timeSlots.map((time) => {
          //@ts-ignore
          const timeCode = DateHelper.parseTimeTo24Hour(time); // Adjusted for plain string `time`
          return {
            ...time, // Spread the original TimeSlots properties
            timeCode: timeCode, // Add timeCode property
            isAvailable: time.isAvailable ?? false, // Default value for isAvailable
            discount: time.discount ?? [], // Default value for discounts
          };
        });
      }

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

const getTimeScheduleFromDBForProfessional = async (id: string) => {
  const schedule = await Schedule.findOne({ professional: id }).lean();
  if (!schedule) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Schedule not found!');
  }
  return schedule;
};

const deleteScheduleFromDB = async (id: string) => {
  const schedule = await Schedule.findByIdAndDelete(id);
  if (!schedule) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Schedule not found!');
  }
  return schedule;
};

export const ScheduleServices = {
  createScheduleToDB,
  updateScheduleForDaysInDB,
  getTimeScheduleFromDBForProfessional,
  deleteScheduleFromDB,
};
