import { JwtPayload } from 'jsonwebtoken';
import { ISchedule } from './schedule.interface';
import { User } from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Schedule } from './schedule.model';
import mongoose from 'mongoose';
import { Professional } from '../professional/professional.model';
import { Reservation } from '../reservation/reservation.model';

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

const getTimeScheduleFromDBForProfessional = async (id: string) => {
  const professional = await Professional.findById({ _id: id });
  if (!professional || !professional.scheduleId) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Professional or schedule not found!',
    );
  }
  const schedule = await Schedule.findById(professional.scheduleId);
  if (!schedule) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Schedule not found!');
  }
  return schedule;
};

const checkProfessionalAvailability = async (
  professionalId: string,
  selectedDate: string,
) => {
  const professional = await Professional.findById(professionalId);
  if (!professional) {
    throw new Error('Professional not found');
  }

  const isFreelancer = professional.isFreelancer;

  const schedule = await Schedule.findOne({ professional: professionalId });
  if (!schedule) {
    throw new Error('Schedule not found for this professional');
  }

  // Step 3: Use aggregation to count confirmed reservations for the selected date and time slots
  const reservationCounts = await Reservation.aggregate([
    {
      $match: {
        professional: professionalId,
        date: selectedDate,
        status: 'confirmed',
      },
    },
    { $group: { _id: '$time', count: { $sum: 1 } } },
  ]);

  // Step 4: Create a map of the reservation counts by time slot
  const reservationMap = reservationCounts.reduce((acc, { _id, count }) => {
    acc[_id] = count;
    return acc;
  }, {} as Record<string, number>);

  // Step 5: Update the schedule with availability
  const updatedSchedule = schedule.days.map((day) => {
    if (day.day === selectedDate) {
      // For each day, loop through the time slots
      day.timeSlots = day.timeSlots.map((slot) => {
        const bookedCount = reservationMap[slot.time] || 0;

        if (isFreelancer) {
          // Freelancer check: If a reservation exists for the time slot, mark as unavailable
          return {
            ...slot,
            isAvailable: bookedCount === 0,
            notAvailable: bookedCount > 0,
          };
        }

        // Team-based check: If the booked count matches or exceeds the team size, mark as unavailable
        const isSlotFullyBooked = bookedCount >= professional.teamSize.max;
        return {
          ...slot,
          isAvailable: !isSlotFullyBooked,
          notAvailable: isSlotFullyBooked,
        };
      });
    }
    return day;
  });

  return updatedSchedule;
};

export const ScheduleServices = {
  createScheduleToDB,
  updateScheduleForDaysInDB,
  getTimeScheduleFromDBForProfessional,
};
