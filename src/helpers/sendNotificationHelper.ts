import { Types } from 'mongoose';
import { Notification } from '../app/modules/notification/notification.model';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

import { INotification } from '../app/modules/notification/notification.interface';
import { sendPushNotification } from './pushNotificationHelper';

type IBulkNotification = {
  users: Types.ObjectId[];
  title: string;
  message: string;
  type: string;
  isPushNotification?: boolean;
  deviceId?: string;
  destination?: string;
  role?: string;
  id?: string;
};

export const sendNotification = async (
  namespace: string,
  recipient: Types.ObjectId,
  data: INotification,
  pushNotificationData?: {
    deviceId: string;
    destination: string;
    role: string;
    id?: string;
    icon?: string;
    title?: string;
    message?: string;
  },
) => {
  const result = await Notification.create(data);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create notification',
    );
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const socket = global.io;

  if(pushNotificationData){
    const {title, message, role, destination, id, icon, deviceId} = pushNotificationData;
    await sendPushNotification(
      deviceId || 'fa-JVHQxTXm24r6NBoI1uQ:APA91bFhG2FTjMA547cuirYKvIOSYEnLpS9gpMlQ84y7kiNaF71-Azn_e64GWMYrB3NzTWUDeKyAh37eWQTmNiOGpRfNr0W80xntui5i90Q9EgROCZZVVkI',
      title ? title : data.title ,
     message ? message : data.message,
      {
        role: role,
        destination: destination,
        id: new Types.ObjectId(id).toString(),
      },
      icon
    );
  }
  

  socket.emit(`${namespace}::${recipient}`, result);
};

export const sendNotificationToMultipleRecipients = async (
  namespace: string,
  recipientNotifications: {
    recipient: Types.ObjectId | string;
    data: INotification;
  }[],
) => {
  const notifications = recipientNotifications.map(({ recipient, data }) => ({
    ...data,
    recipient,
  }));

  const result = await Notification.insertMany(notifications);
  if (!result || result.length === 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create notifications',
    );
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const socket = global.io;

  // Emit notifications to each recipient with their specific data
  recipientNotifications.forEach(({ recipient, data }) => {
    socket.emit(`${namespace}::${recipient}`, data);
  });
};

export const handleNotificationForInvitation = async (
  namespace: string,
  notifications: {
    userId: string;
    title: string;
    message: string;
    type: string;
  }[],
) => {
  const bulkNotifications = notifications.map((notification) => ({
    updateOne: {
      filter: { userId: notification.userId },
      update: {
        $push: {
          notifications: {
            userId: notification.userId,
            title: notification.title,
            message: notification.message,
            type: notification.type,
          },
        },
      },
      upsert: true,
    },
  }));

  const result = await Notification.bulkWrite(bulkNotifications);

  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create notification for invitation.',
    );
  }

  //@ts-ignore
  const socket = global.io; // Assuming `socket` is correctly initialized globally

  notifications.forEach((notification) => {
    socket.emit(`getNotification::${notification.userId}`, {
      title: notification.title,
      message: notification.message,
      type: notification.type,
    });
  });
};

export const sendDataWithSocket = async (
  namespace: string,
  recipient: Types.ObjectId,
  data: any,
) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const socket = global.io;

  socket.emit(`${namespace}::${recipient}`, data);
};
