import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.service';
import { userFilterableFields } from './user.constants';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../types/pagination';
import { Types } from 'mongoose';

const createUser = catchAsync(async (req: Request, res: Response) => {
  const { ...userData } = req.body;
  const result = await UserService.createUserToDB(userData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User created successfully',
    data: result,
  });
});

const getUserProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await UserService.getUserProfileFromDB(user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile data retrieved successfully',
    data: result,
  });
});

const getAllUser = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, userFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await UserService.getAllUser(filters, paginationOptions);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All user retrieved successfully',
    meta: result.meta,
    data: result,
  });
});

const restrictOrUnrestrictUser = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await UserService.restrictOrUnrestrictUser(
      new Types.ObjectId(id),
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'User status updated successfully',
      data: result,
    });
  },
);

const approveUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.approveUser(new Types.ObjectId(id));
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User approved successfully',
    data: result,
  });
});

export const UserController = {
  createUser,
  getUserProfile,
  getAllUser,

  restrictOrUnrestrictUser,
  approveUser,
};
