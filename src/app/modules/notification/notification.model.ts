import { model, Schema } from 'mongoose';
import { INotification, NotificationModel } from './notification.interface';
import { USER_ROLES } from '../../../enums/user';

const notificationSchema = new Schema<INotification, NotificationModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    isCounted: { type: Boolean, default: false },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [USER_ROLES.USER, USER_ROLES.PROFESSIONAL, USER_ROLES.ADMIN],
      required: true,
    },
  },
  { timestamps: true },
);

notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 * 24 * 7 },
);

// Additional index for frequent queries
notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = model<INotification, NotificationModel>(
  'Notification',
  notificationSchema,
);
