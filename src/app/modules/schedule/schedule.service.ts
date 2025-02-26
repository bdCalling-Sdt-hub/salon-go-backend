import { Types } from 'mongoose';
import { JwtPayload } from 'jsonwebtoken';
import { ISchedule } from './schedule.interface';
import { User } from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Schedule } from './schedule.model';
import { Professional } from '../professional/professional.model';
import { DateHelper } from '../../../utils/date.helper';
import { Reservation } from '../reservation/reservation.model';
import { USER_ROLES } from '../../../enums/user';
import getNextOnboardingStep from '../professional/professional.utils';
import { IProfessional } from '../professional/professional.interface';

const createScheduleToDB = async (user: JwtPayload, data: ISchedule) => {
  const isUserExist = await User.findById({ _id: user.id, status: 'active' });
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }
  const isScheduleExist = await Schedule.findOne({ professional: user.userId });


  try {
    // Filter out the days where `check` is false
    const validDays = data.days
      .filter((day) => day.check) // Keep only days where check is true
      .map((day) => {
        const { check, ...rest } = day; // Remove the check field from the payload
        return {
          ...rest,
          timeSlots: day.timeSlots.map((time) => {
            //@ts-ignore
            const timeCode = DateHelper.parseTimeTo24Hour(time); // Adjusted for plain string `time`
            return {
              time: time, // Original time in 12-hour format
              timeCode: timeCode, // ISO 24-hour format
            };
          }),
        };
      });

      if (!isScheduleExist) {
        const result = await Schedule.create({
          professional: user.userId,
          days: validDays,
        });

        const professional = await Professional.findOneAndUpdate(
          { _id: user.userId },
          { scheduleId: result._id },
          { new: true },
        );
        const nextStep = getNextOnboardingStep(professional as IProfessional);

        return { result, nextStep };
      }

    const result = await Schedule.findOneAndUpdate(
      { professional: user.userId },
      {
        $set: { professional: user.userId, days: validDays }, // Only include valid days
      },
    );
    if (!result) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Schedule does not exist!');
    }

    // Update the professional's scheduleId
    const professional = await Professional.findOneAndUpdate(
      { _id: user.userId },
      { scheduleId: result._id },
      { new: true },
    );

    const nextStep = getNextOnboardingStep(professional as IProfessional);
  

    return {result, nextStep};
  } catch (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create schedule');
  }
};


const updateScheduleForDaysInDB = async (
  user: JwtPayload,
  updates: Partial<ISchedule>,
) => {
  console.log(updates);
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

    // Filter out the days where `check` is false
    const validUpdates = updates.days
      .filter((updateDay) => updateDay.check) // Only include days where check is true
      .map((updateDay) => {
        const { check, ...rest } = updateDay; // Remove the check field
        return rest;
      });

    // Update the days in the schedule
    validUpdates.forEach((updateDay) => {
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

const getTimeScheduleFromDBForProfessional = async (user: JwtPayload) => {
  const defaultDays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const schedule = await Schedule.findOne({
    professional: user.userId,
  }).lean();
  if (!schedule) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Schedule not found!');
  }
  // Create a map of days with a default structure
  const daysMap = new Map(
    defaultDays.map((day) => [
      day,
      { day, check: false, timeSlots: [], startTime: '', endTime: '' },
    ]),
  );

  // Populate the map with days from the database
  for (const day of schedule.days) {
    daysMap.set(day.day, {
      ...day,
      check: true,
      //@ts-ignore
      timeSlots: day.timeSlots.map((time) => ({
        time: time.time,
        timeCode: time.timeCode,
        isAvailable: time.isAvailable ?? false,
        discount: time.discount ?? 0,
      })),
    });
  }

  // Convert map values to an array for the response
  const populatedDays = Array.from(daysMap.values());

  return {
    ...schedule,
    days: populatedDays,
  };
};


const getTimeScheduleForCustomer = async (
  id: Types.ObjectId,
  user: JwtPayload,
  date?: string,
  serviceDuration?: string // in minutes
) => {
  const defaultDays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const customerId = user.role === USER_ROLES.USER ? user.userId : null;
  const [schedule, customerReservations] = await Promise.all([
    Schedule.findOne({ professional: id }).lean(),
    customerId
      ? Reservation.find({
          professional: id,
          customer: customerId,
          status: { $in: ['pending', 'confirmed'] },
        })
          .select('serviceStartDateTime serviceEndDateTime')
          .lean()
      : [],
  ]);

  if (!schedule) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Schedule not found!');
  }

  const daysMap = new Map(
    defaultDays.map((day) => [
      day,
      { day, check: false, timeSlots: [], startTime: '', endTime: '' },
    ])
  );

  const isTimeSlotReserved = (timeCode: number, targetDay: string) => {
    return customerReservations.some((reservation) => {
      const reservationDate = new Date(reservation.serviceStartDateTime);
      const reservationDay = defaultDays[reservationDate.getUTCDay()];
      const reservationTimeCode =
        reservationDate.getUTCHours() * 100 + reservationDate.getUTCMinutes();
      return reservationDay === targetDay && reservationTimeCode === timeCode;
    });
  };

  let selectedDay: string | undefined;
  if (date) {
    const [day, month, year] = date.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);
    selectedDay = defaultDays[dateObj.getDay()];
  }

  // Convert serviceDuration to minutes
  const serviceDurationMinutes = serviceDuration ? parseInt(serviceDuration) : 0;

  // Helper function to check if a time slot conflicts with unavailable slots
  const hasConflictWithUnavailableSlots = (startTimeCode: number, duration: number, dayTimeSlots: any[]) => {
    const startTimeInMinutes = Math.floor(startTimeCode / 100) * 60 + (startTimeCode % 100);
    const endTimeInMinutes = startTimeInMinutes + duration;

    // Check each time slot within the duration
    return dayTimeSlots.some(slot => {
      const slotTimeInMinutes = Math.floor(slot.timeCode / 100) * 60 + (slot.timeCode % 100);
      return (
        slotTimeInMinutes >= startTimeInMinutes &&
        slotTimeInMinutes < endTimeInMinutes &&
        !slot.isAvailable
      );
    });
  };

  for (const day of schedule.days) {
    if (selectedDay && day.day !== selectedDay) continue;

    const timeSlots = day.timeSlots.map(timeSlot => {
      const timeCode = timeSlot.timeCode;
      const startHour = Math.floor(timeCode / 100);
      const startMinute = timeCode % 100;
      const startTimeInMinutes = startHour * 60 + startMinute;
      
      let isSlotAvailable = timeSlot.isAvailable ?? false;

      if (customerId) {
        isSlotAvailable = isSlotAvailable && !isTimeSlotReserved(timeCode, day.day);
      }

      if (serviceDurationMinutes > 0 && isSlotAvailable) {
        // Check if service would go beyond closing time (20:00)
        const endTimeInMinutes = startTimeInMinutes + serviceDurationMinutes;
        if (endTimeInMinutes > 20 * 60) { // 20:00 in minutes
          isSlotAvailable = false;
        }

        // Check for conflicts with unavailable slots
        if (isSlotAvailable && hasConflictWithUnavailableSlots(timeCode, serviceDurationMinutes, day.timeSlots)) {
          isSlotAvailable = false;
        }
      }

      return {
        time: timeSlot.time,
        timeCode: timeCode,
        isAvailable: isSlotAvailable,
        discount: timeSlot.discount ?? 0,
      };
    });

    
    daysMap.set(day.day, {
      ...day,
      check: true,
      timeSlots: timeSlots,
    });
  }

  const populatedDays = Array.from(daysMap.values()).filter(day => !selectedDay || day.day === selectedDay);

  return {
    ...schedule,
    days: populatedDays,
  };
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
  getTimeScheduleForCustomer,
};
