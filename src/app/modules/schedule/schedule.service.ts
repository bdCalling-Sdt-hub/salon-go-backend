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
import { DateTime } from 'luxon'; // Import Luxon

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

        // Deduplicate time slots based on time value
        const uniqueTimeSlots: Array<{ time: string; timeCode: number }> = [];
        const timeSet = new Set();

        day.timeSlots.forEach((time) => {
          // Skip if we've already processed this time
          if (timeSet.has(time)) return;

          timeSet.add(time);
          //@ts-ignore
          const timeCode = DateHelper.parseTimeTo24Hour(time); // Adjusted for plain string `time`
          uniqueTimeSlots.push({
            time: typeof time === 'string' ? time : time.time, // Original time in 12-hour format
            timeCode: timeCode, // ISO 24-hour format
          });
        });

        return {
          ...rest,
          timeSlots: uniqueTimeSlots,
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

    return { result, nextStep };
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
        // Deduplicate time slots based on time value
        const uniqueTimeSlots: Array<{
          time: string;
          timeCode: number;
          isAvailable: boolean;
          discount: Number;
        }> = [];
        const timeSet = new Set();

        updateDay.timeSlots.forEach((time) => {
          // Use time or time.time depending on the structure
          const timeValue = typeof time === 'string' ? time : time.time;

          // Skip if we've already processed this time
          if (timeSet.has(timeValue)) return;

          timeSet.add(timeValue);

          //@ts-ignore
          const timeCode = DateHelper.parseTimeTo24Hour(timeValue); // Adjusted for plain string `time`
          uniqueTimeSlots.push({
            ...time, // Spread the original TimeSlots properties
            timeCode: timeCode, // Add timeCode property
            isAvailable: time.isAvailable ?? false, // Default value for isAvailable
            discount: time.discount ?? 0, // Default value for discount percentage
          });
        });

        dayToUpdate.timeSlots = uniqueTimeSlots.map((slot) => ({
          ...slot,
          discount: Number(slot.discount) || 0, // Convert discount to Number type
        }));
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
  date?: string, // Expected format: dd/MM/yyyy
  serviceDuration?: string, // in minutes
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
  const ALGERIA_TIMEZONE = 'Africa/Algiers'; // Define the target timezone

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
    ]),
  );

  // Get current time in Algeria
  const nowInAlgeria = DateTime.now().setZone(ALGERIA_TIMEZONE);
  let targetDateLuxon: DateTime | null = null;
  let selectedDay: string | undefined;
  let isToday = false;

  if (date) {
    try {
      // Parse the date string (dd/MM/yyyy) into a Luxon DateTime object in Algeria timezone
      targetDateLuxon = DateTime.fromFormat(date, 'dd/MM/yyyy', {
        zone: ALGERIA_TIMEZONE,
      });
      if (!targetDateLuxon.isValid) {
        throw new Error(`Invalid date format: ${date}. Expected dd/MM/yyyy.`);
      }
      selectedDay = defaultDays[targetDateLuxon.weekday % 7]; // Luxon weekday: 1 (Mon) - 7 (Sun)
      // Check if the requested date is today in Algeria
      isToday = targetDateLuxon.hasSame(nowInAlgeria, 'day');
    } catch (error) {
      console.error('Error parsing date:', error);
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Invalid date format provided: ${date}. Please use dd/MM/yyyy.`,
      );
    }
  } else {
    // If no date is provided, default to today
    targetDateLuxon = nowInAlgeria;
    selectedDay = defaultDays[targetDateLuxon.weekday % 7];
    isToday = true;
  }

  const isTimeSlotReserved = (timeCode: number, targetDay: string) => {
    return customerReservations.some((reservation) => {
      // Convert reservation start time (assumed stored as local Algerian time) to Luxon DateTime
      const reservationStart = DateTime.fromJSDate(
        reservation.serviceStartDateTime,
        { zone: ALGERIA_TIMEZONE },
      );
      const reservationDay = defaultDays[reservationStart.weekday % 7];
      const reservationTimeCode =
        reservationStart.hour * 100 + reservationStart.minute;
      return reservationDay === targetDay && reservationTimeCode === timeCode;
    });
  };

  // Convert serviceDuration to minutes
  const serviceDurationMinutes = serviceDuration
    ? parseInt(serviceDuration)
    : 0;

  // Helper function to check if a time slot conflicts with unavailable slots
  const hasConflictWithUnavailableSlots = (
    startTimeCode: number,
    duration: number,
    dayTimeSlots: any[],
  ) => {
    const startTimeInMinutes =
      Math.floor(startTimeCode / 100) * 60 + (startTimeCode % 100);
    const endTimeInMinutes = startTimeInMinutes + duration;

    // Check each time slot within the duration
    return dayTimeSlots.some((slot) => {
      const slotTimeInMinutes =
        Math.floor(slot.timeCode / 100) * 60 + (slot.timeCode % 100);
      return (
        slotTimeInMinutes >= startTimeInMinutes &&
        slotTimeInMinutes < endTimeInMinutes &&
        !slot.isAvailable // Check against the original availability from the schedule
      );
    });
  };

  for (const day of schedule.days) {
    if (selectedDay && day.day !== selectedDay) continue; // Skip if a specific date is requested and it's not this day

    const timeSlots = day.timeSlots.map((timeSlot) => {
      const timeCode = timeSlot.timeCode;
      const startHour = Math.floor(timeCode / 100);
      const startMinute = timeCode % 100;

      // Create a Luxon DateTime for the specific slot on the target date in Algeria timezone
      const slotDateTime = targetDateLuxon!.set({
        hour: startHour,
        minute: startMinute,
        second: 0,
        millisecond: 0,
      });

      let isSlotAvailable = timeSlot.isAvailable ?? false; // Start with schedule availability

      // --- Check if the slot is in the past (only if the requested date is today) ---
      if (isToday && slotDateTime < nowInAlgeria) {
        isSlotAvailable = false;
      }
      // --- End past time check ---

      // Check if already reserved by the customer (only if availability hasn't been set to false yet)
      if (isSlotAvailable && customerId) {
        isSlotAvailable = !isTimeSlotReserved(timeCode, day.day);
      }

      // Check duration related constraints (only if availability hasn't been set to false yet)
      if (isSlotAvailable && serviceDurationMinutes > 0) {
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = startTimeInMinutes + serviceDurationMinutes;

        // Check if service would go beyond closing time (assuming 20:00 based on previous logic)
        if (endTimeInMinutes > 20 * 60) {
          isSlotAvailable = false;
        }

        // Check for conflicts with originally unavailable slots within the duration
        if (
          isSlotAvailable &&
          hasConflictWithUnavailableSlots(
            timeCode,
            serviceDurationMinutes,
            day.timeSlots, // Pass the original slots from the schedule for conflict check
          )
        ) {
          isSlotAvailable = false;
        }
      }

      return {
        time: timeSlot.time,
        timeCode: timeCode,
        isAvailable: isSlotAvailable, // Final calculated availability
        discount: timeSlot.discount ?? 0,
      };
    });

    daysMap.set(day.day, {
      ...day,
      check: true,
      //@ts-ignore
      timeSlots: timeSlots,
    });
  }

  const populatedDays = Array.from(daysMap.values()).filter(
    (day) => !selectedDay || day.day === selectedDay,
  );

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

const setDiscount = async (
  user: JwtPayload,
  payload: { timeCode: number; discount: number; day: string },
) => {
  // Validate the discount value
  if (payload.discount < 0 || payload.discount > 100) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Discount must be between 0 and 100.',
    );
  }

  // Find the schedule for the professional
  const schedule = await Schedule.findOne({ professional: user.userId });
  if (!schedule) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Schedule not found!');
  }

  // Find the day in the schedule
  const dayIndex = schedule.days.findIndex((day) => day?.day === payload.day);
  if (dayIndex === -1) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      `Schedule for ${payload.day} not found!`,
    );
  }

  // Find the time slot in the day
  const timeSlotIndex = schedule.days[dayIndex].timeSlots.findIndex(
    (timeSlot) => timeSlot.timeCode === payload.timeCode,
  );
  if (timeSlotIndex === -1) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      `Time slot ${payload.timeCode} not found!`,
    );
  }

  // Update the discount for the time slot
  schedule.days[dayIndex].timeSlots[timeSlotIndex].discount = payload.discount;

  // Save the updated schedule
  await schedule.save();

  return `Discount for ${payload.day} at ${payload.timeCode} has been set to ${payload.discount}%`;
};

export const ScheduleServices = {
  createScheduleToDB,
  updateScheduleForDaysInDB,
  getTimeScheduleFromDBForProfessional,
  deleteScheduleFromDB,
  getTimeScheduleForCustomer,
  setDiscount,
};
