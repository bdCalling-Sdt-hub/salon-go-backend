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

  const isScheduleExist = await Schedule.findOne({ professional: user.userId });
  if (isScheduleExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Schedule already exist!');
  }

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

    const result = await Schedule.create({
      professional: user.userId,
      days: validDays, // Only include valid days
    });

    console.log(result);

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

//     // Update the days in the schedule
//     updates.days.forEach((updateDay) => {
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
//         dayToUpdate.timeSlots = updateDay.timeSlots.map((time) => {
//           //@ts-ignore
//           const timeCode = DateHelper.parseTimeTo24Hour(time); // Adjusted for plain string `time`
//           return {
//             ...time, // Spread the original TimeSlots properties
//             timeCode: timeCode, // Add timeCode property
//             isAvailable: time.isAvailable ?? false, // Default value for isAvailable
//             discount: time.discount ?? [], // Default value for discounts
//           };
//         });
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

// const createScheduleToDB = async (user: JwtPayload, data: ISchedule) => {
//   const [isUserExist, existingSchedule] = await Promise.all([
//     User.findById({ _id: user.id, status: 'active' }),
//     Schedule.findOne({ professional: user.userId }),
//   ]);

//   if (!isUserExist) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
//   }
//   const validDays = data.days
//     .filter((day) => day.check) // Keep only days where check is true
//     .map((day) => {
//       const { check, ...rest } = day; // Remove the check field from the payload
//       return {
//         ...rest,
//         timeSlots: day.timeSlots.map((time) => {
//           //@ts-ignore
//           const timeCode = DateHelper.parseTimeTo24Hour(time); // Adjusted for plain string `time`
//           return {
//             time: time.time, // Ensure time is a string
//             timeCode: timeCode, // ISO 24-hour format
//             isAvailable: time.isAvailable ?? false, // Default value for isAvailable
//             discount: time.discount ?? [], // Default value for discounts
//           };
//         }),
//       };
//     });

//   try {
//     let result;
//     if (existingSchedule) {
//       // If the schedule exists, update it
//       existingSchedule.days = validDays; // Update the days
//       result = await existingSchedule.save(); // Save the updated schedule
//       console.log('Schedule updated:', result);
//     } else {
//       // If the schedule doesn't exist, create a new one
//       result = await Schedule.create({
//         professional: user.userId,
//         days: validDays, // Only include valid days
//       });
//       console.log('Schedule created:', result);
//     }

//     // Update the professional's scheduleId if it's a new schedule or updated one
//     await Professional.findOneAndUpdate(
//       { _id: user.userId },
//       { scheduleId: result._id },
//       { new: true },
//     );

//     return result;
//   } catch (error) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       'Failed to create or update schedule',
//     );
//   }
// };

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
    console.log(updatedSchedule);
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
  const defaultDays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const schedule = await Schedule.findOne({ professional: id }).lean();
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

export default getTimeScheduleFromDBForProfessional;

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
