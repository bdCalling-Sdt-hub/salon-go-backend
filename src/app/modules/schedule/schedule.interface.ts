import { Document, Model, Types } from 'mongoose';

type Reservation = {
  user: Types.ObjectId;
  status: 'pending' | 'confirmed' | 'cancelled';
};

type TimeSlots = {
  time: string; // 'HH:mm' format
  isAvailable: boolean;
  discount: Types.ObjectId;
};

type Day = {
  day:
    | 'Monday'
    | 'Tuesday'
    | 'Wednesday'
    | 'Thursday'
    | 'Friday'
    | 'Saturday'
    | 'Sunday';
  timeSlots: TimeSlots[];
};

export type ISchedule = {
  professional: Types.ObjectId;
  startTime: string; // 'HH:mm' format
  endTime: string; // 'HH:mm' format
  days: Day[];
};

export type ScheduleModel = Model<ISchedule>;
