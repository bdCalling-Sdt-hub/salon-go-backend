import { Schema, Types, model } from 'mongoose';
import { ISchedule, ScheduleModel } from './schedule.interface';

const scheduleSchema = new Schema<ISchedule, ScheduleModel>(
  {
    professional: {
      type: Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
    },
    days: [
      {
        day: {
          type: String,
          enum: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
          required: true,
        },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        timeSlots: {
          type: [
            {
              time: { type: String, required: true },
              timeCode: { type: Number, required: true },
              isAvailable: { type: Boolean, default: true },
              discount: { type: Number },
            },
          ],
          required: true,
        },
      },
    ],
  },
  { timestamps: true },
);

export const Schedule = model<ISchedule, ScheduleModel>(
  'Schedule',
  scheduleSchema,
);

scheduleSchema.index({ professional: 1 });
scheduleSchema.index({ 'days.day': 1, 'days.timeSlots.time': 1 });
