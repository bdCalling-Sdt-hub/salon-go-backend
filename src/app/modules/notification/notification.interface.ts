import { Model, Types } from 'mongoose';

export type INotification = {
  userId: Types.ObjectId;
  title: string;
  message: string;
  isRead?: boolean;
  isCounted: boolean;
  type: string;
};

export type NotificationModel = Model<INotification>;
