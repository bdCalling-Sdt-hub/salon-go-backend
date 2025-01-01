import { Document, Model, Types } from 'mongoose';

type Reservation = {
  user: Types.ObjectId;
  status: 'pending' | 'confirmed' | 'cancelled';
};

type TimeSlots = {
  time: string; // 'HH:mm' format
  timeCode: number;
  isAvailable: boolean;
  discount: Types.ObjectId;
};

type Day = {
  startTime: any;
  endTime: any;
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
  _id: Types.ObjectId;
  professional: Types.ObjectId;
  startTime: string; // 'HH:mm' format
  endTime: string; // 'HH:mm' format
  days: Day[];
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduleModel = Model<ISchedule>;
