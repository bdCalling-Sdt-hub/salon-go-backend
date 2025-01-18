import { Request, Response, NextFunction } from 'express';
import { ScheduleServices } from './schedule.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { USER_ROLES } from '../../../enums/user';
import { Types } from 'mongoose';

const createSchedule = catchAsync(async (req: Request, res: Response) => {
  console.log(req.body);
  const user = req.user;
  const result = await ScheduleServices.createScheduleToDB(user, req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Schedule created successfully',
    data: result,
  });
});

const updateSchedule = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await ScheduleServices.updateScheduleForDaysInDB(
    user,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Schedule updated successfully',
    data: result,
  });
});

const getScheduleForProfessional = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.query.professionalId;
    const user = req.user;

    const result = await ScheduleServices.getTimeScheduleFromDBForProfessional(
      id as string,
      user,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Schedule retrieved successfully',
      data: result,
    });
  },
);

const deleteSchedule = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ScheduleServices.deleteScheduleFromDB(id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Schedule deleted successfully',
    data: result,
  });
});

export const ScheduleController = {
  createSchedule,
  updateSchedule,
  getScheduleForProfessional,
  deleteSchedule,
};
