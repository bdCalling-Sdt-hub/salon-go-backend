import { z } from 'zod';

const createScheduleZodSchema = z.object({
  body: z.object({
    days: z.array(
      z.object({
        day: z.enum(
          [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
          { required_error: 'Day is required' },
        ),
        startTime: z.string({ required_error: 'Start time is required' }),
        check: z.boolean({ required_error: 'Check is required' }),
        endTime: z.string({ required_error: 'End time is required' }),
        timeSlots: z.array(
          z.string({ required_error: 'Time slot is required' }),
        ),
      }),
      { required_error: 'Days are required' },
    ),
  }),
});

const updateScheduleZodSchema = z.object({
  body: z.object({
    days: z.array(
      z.object({
        day: z.enum(
          [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
          { required_error: 'Day is required' },
        ),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        check: z.boolean().optional(),
        timeSlots: z.array(z.string()).optional(),
      }),
    ),
  }),
});

export const ScheduleValidations = {
  createScheduleZodSchema,
  updateScheduleZodSchema,
};
