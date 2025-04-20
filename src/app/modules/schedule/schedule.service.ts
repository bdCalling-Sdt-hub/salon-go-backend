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

      // If day doesn't exist in schedule, create it
      if (dayIndex === -1) {
        // Create a new day entry with default values
        const newDay = {
          day: updateDay.day,
          startTime: updateDay.startTime || '',
          endTime: updateDay.endTime || '',
          timeSlots: [],
        };
        schedule.days.push(newDay);
        // Get the index of the newly added day
        const newDayIndex = schedule.days.length - 1;

        // Process time slots for the new day
        if (updateDay.timeSlots && updateDay.timeSlots.length > 0) {
          // Create completely new time slots for this day
          const processedTimeSlots = processTimeSlots(updateDay.timeSlots);
          schedule.days[newDayIndex].timeSlots = processedTimeSlots;
        }
      } else {
        // Update existing day
        const dayToUpdate = schedule.days[dayIndex];

        // Update startTime and endTime if provided
        if (updateDay.startTime) {
          dayToUpdate.startTime = updateDay.startTime;
        }
        if (updateDay.endTime) {
          dayToUpdate.endTime = updateDay.endTime;
        }

        // If time slots are provided, completely replace them
        if (updateDay.timeSlots && updateDay.timeSlots.length > 0) {
          // Process and replace all time slots for this day
          const processedTimeSlots = processTimeSlots(updateDay.timeSlots);
          dayToUpdate.timeSlots = processedTimeSlots;
        }

        schedule.days[dayIndex] = dayToUpdate;
      }
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

// Helper function to process time slots with deduplication
const processTimeSlots = (timeSlots: any[]) => {
  const uniqueTimeSlots: Array<{
    time: string;
    timeCode: number;
    isAvailable: boolean;
    discount: number;
  }> = [];
  const timeSet = new Set();

  timeSlots.forEach((time) => {
    // Extract the time value consistently
    const timeValue = typeof time === 'string' ? time : time.time;

    // Skip if we've already processed this time
    if (timeSet.has(timeValue)) return;

    timeSet.add(timeValue);

    //@ts-ignore
    const timeCode = DateHelper.parseTimeTo24Hour(timeValue);
    uniqueTimeSlots.push({
      time: timeValue,
      timeCode: timeCode,
      isAvailable: typeof time === 'string' ? false : time.isAvailable ?? false,
      discount: typeof time === 'string' ? 0 : time.discount ?? 0,
    });
  });

  return uniqueTimeSlots.map((slot) => ({
    ...slot,
    discount: Number(slot.discount) || 0, // Convert discount to Number type
  }));
};

// const updateScheduleForDaysInDB = async (
//   user: JwtPayload,
//   updates: Partial<ISchedule>,
// ) => {
//   try {
//     // Validate the input
//     if (!Array.isArray(updates.days)) {
//       throw new ApiError(
//         StatusCodes.BAD_REQUEST,
//         'Invalid input: days should be an array',
//       );
//     }

//     // Find the professional and their existing schedule
//     const professional = await Professional.findOne({ _id: user.userId });
//     if (!professional || !professional.scheduleId) {
//       throw new ApiError(
//         StatusCodes.NOT_FOUND,
//         'Professional or schedule not found!',
//       );
//     }

//     // Find the schedule
//     const schedule = await Schedule.findById(professional.scheduleId);
//     if (!schedule) {
//       throw new ApiError(StatusCodes.NOT_FOUND, 'Schedule not found!');
//     }

//     // Filter out the days where `check` is false
//     const validUpdates = updates.days
//       .filter((updateDay) => updateDay.check) // Only include days where check is true
//       .map((updateDay) => {
//         const { check, ...rest } = updateDay; // Remove the check field
//         return rest;
//       });

//     // Update the days in the schedule
//     validUpdates.forEach((updateDay) => {
//       const dayIndex = schedule.days.findIndex((d) => d.day === updateDay.day);
//       if (dayIndex === -1) {
//         throw new ApiError(
//           StatusCodes.NOT_FOUND,
//           `Schedule for ${updateDay.day} not found!`,
//         );
//       }

//       const dayToUpdate = schedule.days[dayIndex];

//       // Update startTime and endTime if provided
//       if (updateDay.startTime) {
//         dayToUpdate.startTime = updateDay.startTime;
//       }
//       if (updateDay.endTime) {
//         dayToUpdate.endTime = updateDay.endTime;
//       }

//       if (updateDay.timeSlots) {
//         // Deduplicate time slots based on time value
//         const uniqueTimeSlots: Array<{
//           time: string;
//           timeCode: number;
//           isAvailable: boolean;
//           discount: Number;
//         }> = [];
//         const timeSet = new Set();

//         updateDay.timeSlots.forEach((time) => {
//           // Extract the time value consistently
//           const timeValue = typeof time === 'string' ? time : time.time;

//           // Skip if we've already processed this time
//           if (timeSet.has(timeValue)) return;

//           timeSet.add(timeValue);

//           //@ts-ignore
//           const timeCode = DateHelper.parseTimeTo24Hour(timeValue);
//           uniqueTimeSlots.push({
//             ...(typeof time === 'string' ? { time: timeValue } : time), // Preserve original properties
//             time: timeValue, // Ensure time property is set
//             timeCode: timeCode, // Add timeCode property
//             isAvailable:
//               typeof time === 'string' ? false : time.isAvailable ?? false, // Default value for isAvailable
//             discount: typeof time === 'string' ? 0 : time.discount ?? 0, // Default value for discount percentage
//           });
//         });

//         dayToUpdate.timeSlots = uniqueTimeSlots.map((slot) => ({
//           ...slot,
//           discount: Number(slot.discount) || 0, // Convert discount to Number type
//         }));
//       }

//       schedule.days[dayIndex] = dayToUpdate;
//     });

//     // Save the updated schedule
//     const updatedSchedule = await schedule.save();

//     return updatedSchedule;
//   } catch (error) {
//     console.error('Error updating schedule for days:', error);
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       'Failed to update schedule for one or more days',
//     );
//   }
// };

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
  console.log('Function called with params:', {
    id,
    user: user.userId,
    date,
    serviceDuration,
  });

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
  console.log('Customer ID:', customerId);

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

  console.log('Found reservations:', customerReservations.length);

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
  console.log('Current time in Algeria:', nowInAlgeria.toISO());

  let targetDateLuxon: DateTime | null = null;
  let selectedDay: string | undefined;
  let isToday = false;

  if (date) {
    try {
      console.log('Processing date:', date);

      // Parse the date string (dd/MM/yyyy) into a Luxon DateTime object in Algeria timezone
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = date.match(dateRegex);

      if (!match) {
        console.error('Date regex did not match:', date);
        throw new Error(`Invalid date format: ${date}. Expected dd/MM/yyyy.`);
      }

      // Extract components and convert to numbers
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);

      console.log('Parsed date components:', { day, month, year });

      // Create DateTime object directly from components
      targetDateLuxon = DateTime.fromObject(
        { day, month, year },
        { zone: ALGERIA_TIMEZONE },
      );

      console.log('Created DateTime object:', targetDateLuxon.toISO());

      if (!targetDateLuxon.isValid) {
        console.error(
          'Invalid DateTime object:',
          targetDateLuxon.invalidExplanation,
        );
        throw new Error(`Invalid date: ${date}. Please provide a valid date.`);
      }

      selectedDay = defaultDays[targetDateLuxon.weekday % 7]; // Luxon weekday: 1 (Mon) - 7 (Sun)
      console.log('Selected day:', selectedDay);

      // Check if the requested date is today in Algeria
      isToday = targetDateLuxon.hasSame(nowInAlgeria, 'day');
      console.log('Is today:', isToday);
    } catch (error) {
      console.error('Error parsing date:', error);
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Invalid date format provided: ${date}. Please use dd/MM/yyyy.`,
      );
    }
  } else {
    // If no date is provided, default to today but don't filter by day
    console.log('No date provided, showing all days');
    targetDateLuxon = nowInAlgeria;
    selectedDay = undefined; // Don't filter by day
    isToday = true;
  }

  const isTimeSlotReserved = (timeCode: number, targetDay: string) => {
    const isReserved = customerReservations.some((reservation) => {
      // Convert reservation start time to Luxon DateTime
      const reservationStart = DateTime.fromJSDate(
        reservation.serviceStartDateTime,
        { zone: ALGERIA_TIMEZONE },
      );
      const reservationDay = defaultDays[reservationStart.weekday % 7];
      const reservationTimeCode =
        reservationStart.hour * 100 + reservationStart.minute;
      return reservationDay === targetDay && reservationTimeCode === timeCode;
    });

    if (isReserved) {
      console.log(`Time slot ${timeCode} on ${targetDay} is reserved`);
    }

    return isReserved;
  };

  // Convert serviceDuration to minutes
  const serviceDurationMinutes = serviceDuration
    ? parseInt(serviceDuration)
    : 0;
  console.log('Service duration in minutes:', serviceDurationMinutes);

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
      const hasConflict =
        slotTimeInMinutes >= startTimeInMinutes &&
        slotTimeInMinutes < endTimeInMinutes &&
        !slot.isAvailable;

      if (hasConflict) {
        console.log(
          `Conflict detected for time ${startTimeCode} with slot ${slot.timeCode}`,
        );
      }

      return hasConflict;
    });
  };

  console.log('Processing days from schedule:', schedule.days.length);
  for (const day of schedule.days) {
    // Only filter by day if a specific date was requested
    if (selectedDay && day.day !== selectedDay) {
      console.log(
        `Skipping day ${day.day} as it's not the selected day ${selectedDay}`,
      );
      continue;
    }

    console.log(
      `Processing day: ${day.day}, time slots: ${day.timeSlots.length}`,
    );
    const timeSlots = day.timeSlots.map((timeSlot) => {
      const timeCode = timeSlot.timeCode;
      const startHour = Math.floor(timeCode / 100);
      const startMinute = timeCode % 100;

      // Create a Luxon DateTime for the specific slot
      let slotDateTime;
      if (selectedDay) {
        // If a specific date was requested, use that date with the slot's time
        slotDateTime = targetDateLuxon!.set({
          hour: startHour,
          minute: startMinute,
          second: 0,
          millisecond: 0,
        });
      } else {
        // If no date was specified, use today's date for past time checks
        // but understand we're showing availability for any day
        slotDateTime = nowInAlgeria.set({
          hour: startHour,
          minute: startMinute,
          second: 0,
          millisecond: 0,
        });
      }

      let isSlotAvailable = timeSlot.isAvailable ?? false; // Start with schedule availability
      console.log(
        `Time slot ${timeSlot.time} initial availability: ${isSlotAvailable}`,
      );

      // Check if the slot is in the past (only if the requested date is today)
      if (selectedDay && isToday && slotDateTime < nowInAlgeria) {
        console.log(`Time slot ${timeSlot.time} is in the past`);
        isSlotAvailable = false;
      }

      // Check if already reserved by the customer
      if (isSlotAvailable && customerId) {
        const reserved = isTimeSlotReserved(timeCode, day.day);
        if (reserved) {
          console.log(
            `Time slot ${timeSlot.time} is already reserved by customer`,
          );
          isSlotAvailable = false;
        }
      }

      // Check duration related constraints
      if (isSlotAvailable && serviceDurationMinutes > 0) {
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = startTimeInMinutes + serviceDurationMinutes;

        // Check if service would go beyond closing time
        if (endTimeInMinutes > 20 * 60) {
          console.log(
            `Time slot ${timeSlot.time} would go beyond closing time`,
          );
          isSlotAvailable = false;
        }

        // Check for conflicts with unavailable slots
        if (
          isSlotAvailable &&
          hasConflictWithUnavailableSlots(
            timeCode,
            serviceDurationMinutes,
            day.timeSlots,
          )
        ) {
          console.log(
            `Time slot ${timeSlot.time} conflicts with unavailable slots`,
          );
          isSlotAvailable = false;
        }
      }

      console.log(
        `Time slot ${timeSlot.time} final availability: ${isSlotAvailable}`,
      );
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
      //@ts-ignore
      timeSlots: timeSlots,
    });
  }

  // If a specific day was requested, only return that day
  // Otherwise, return all days
  const populatedDays = Array.from(daysMap.values()).filter(
    (day) => !selectedDay || day.day === selectedDay,
  );

  console.log(`Returning ${populatedDays.length} days`);
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
