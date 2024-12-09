import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { INotification } from './notification.interface';
import { NotificationService } from './notification.service';
import { Request, Response } from 'express';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../types/pagination';

const createNotification = catchAsync(async (req: Request, res: Response) => {
  const { ...notificationData } = req.body;
  const result = await NotificationService.storeNotificationToDB(
    notificationData,
  );
  sendResponse<INotification>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notification created successfully',
    data: result,
  });
});

const getNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const paginationOptions = pick(req.query, paginationFields);
  const result = await NotificationService.getNotifications(
    user,
    paginationOptions,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notifications retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSingleNotification = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await NotificationService.getSingleNotification(id);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Notification retrieved successfully',
      data: result,
    });
  },
);

export const NotificationController = {
  createNotification,
  getNotifications,
  getSingleNotification,
};
