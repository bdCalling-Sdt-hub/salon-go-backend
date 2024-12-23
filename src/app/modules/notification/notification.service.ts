import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { INotification } from './notification.interface';
import { Notification } from './notification.model';
import { JwtPayload } from 'jsonwebtoken';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../types/response';

const storeNotificationToDB = async (
  data: INotification,
): Promise<INotification> => {
  const result = await Notification.create(data);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create notification',
    );
  }
  return result;
};

const getNotifications = async (
  user: JwtPayload,
  paginationOptions: IPaginationOptions,
): Promise<IGenericResponse<INotification[]>> => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);
  const result = await Notification.find({ userId: user.id })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get notifications');
  }
  const total = await Notification.countDocuments({ userId: user.id });
  return {
    meta: {
      page,
      limit,
      total: total,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

const getSingleNotification = async (id: string) => {
  await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });

  const result = await Notification.findById(id);

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get notification');
  }
  return result;
};

const changeNotificationStatus = async (id: string) => {
  const result = await Notification.findByIdAndUpdate(
    id,
    { isRead: true },
    { new: true },
  );
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update notification status',
    );
  }
  return result;
};

const makeCountTrueToDB = async () => {
  const result = await Notification.updateMany(
    { isCounted: false },
    { isCounted: true },
  );
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update notification status',
    );
  }
  return result;
};

export const NotificationService = {
  storeNotificationToDB,
  getNotifications,
  getSingleNotification,
  changeNotificationStatus,
  makeCountTrueToDB,
};
