import { JwtPayload } from 'jsonwebtoken';
import { ISchedule } from './schedule.interface';
import { User } from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Schedule } from './schedule.model';
import mongoose from 'mongoose';
import { Professional } from '../professional/professional.model';
import { Reservation } from '../reservation/reservation.model';
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

    console.log(result);

    // Update the professional's scheduleId
    await Professional.findOneAndUpdate(
      { auth: user.id },
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
  // Step 1: Fetch the professional details
  const professional = await Professional.findById(professionalId).lean(); // Use `.lean()` for a clean result
  if (!professional) {
    throw new Error('Professional not found');
  }

  const isFreelancer = professional.isFreelancer;

  // Step 2: Fetch the professional's schedule for the selected professional
  const schedule = await Schedule.findOne({
    professional: professionalId,
  }).lean();
  if (!schedule) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Schedule not found for this professional',
    );
  }

  // Step 3: Fetch the confirmed reservations for the selected date
  const reservationCounts = await Reservation.aggregate([
    {
      $match: {
        professional: professionalId,
        date: new Date(selectedDate), // Ensure the date format is handled correctly
        status: 'confirmed', // Only count confirmed reservations
      },
    },
    {
      $group: {
        _id: '$time', // Group by time
        count: { $sum: 1 }, // Count the number of reservations for each time slot
      },
    },
  ]);

  // Step 4: Create a map of the reservation counts for the requested date
  const reservationMap = reservationCounts.reduce((acc, { _id, count }) => {
    acc[_id] = count;
    return acc;
  }, {} as Record<string, number>);

  // Step 5: Find the specific day from the schedule matching the selected date
  const requestedDayOfWeek = new Date(selectedDate).toLocaleString('en-us', {
    weekday: 'long',
  });

  const updatedSchedule = schedule.days.find(
    (day) => day.day === requestedDayOfWeek,
  );

  // If no schedule is found for the requested day, assume all time slots are available
  if (!updatedSchedule) {
    // Return all time slots as available if no schedule exists for the requested day
    return {
      day: requestedDayOfWeek,
      timeSlots: schedule.days[0].timeSlots.map((slot) => ({
        ...slot,
        isAvailable: true,
        notAvailable: false,
      })),
    };
  }

  // Step 6: Map the time slots and calculate availability
  updatedSchedule.timeSlots = updatedSchedule.timeSlots.map((slot) => {
    const bookedCount = reservationMap[slot.time] || 0;

    // If it's a freelancer, mark slots available only if there are no bookings
    if (isFreelancer) {
      return {
        ...slot,
        isAvailable: bookedCount === 0,
        notAvailable: bookedCount > 0,
      };
    }

    // For team-based professionals, check the team size
    const maxTeamSize = professional.teamSize?.max; // Safely check if teamSize and max exist
    const isSlotFullyBooked = maxTeamSize && bookedCount >= maxTeamSize;

    return {
      ...slot,
      isAvailable: !isSlotFullyBooked,
      notAvailable: isSlotFullyBooked,
    };
  });

  // Step 7: Return the updated schedule for the requested day
  return updatedSchedule;
};

export const ScheduleServices = {
  createScheduleToDB,
  updateScheduleForDaysInDB,
  getTimeScheduleFromDBForProfessional,
  checkProfessionalAvailability,
};
