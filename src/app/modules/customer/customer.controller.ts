import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { CustomerService } from './customer.service';
import { ICustomer } from './customer.interface';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { paginationFields } from '../../../types/pagination';
import pick from '../../../shared/pick';

const getCustomerProfile = catchAsync(async (req: Request, res: Response) => {
  console.log('INNNNNN');
  const user = req.user;
  const result = await CustomerService.getCustomerProfile(user);
  sendResponse<ICustomer | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile retrieved successfully',

    data: result,
  });
});

const updateCustomerProfile = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.user;

    const customerData = req.body;

    let profile;
    if (req.files && 'image' in req.files && req.files.image[0]) {
      profile = `/images/${req.files.image[0].filename}`;
    }

    const data: ICustomer = {
      ...customerData,
      profile,
    };

    const result = await CustomerService.updateCustomerProfile(id, data);
    sendResponse<ICustomer | null>(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Profile updated successfully',
      data: result,
    });
  },
);

const deleteCustomerProfile = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.user;
    const result = await CustomerService.deleteCustomerProfile(id);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Profile deleted successfully',
      data: result,
    });
  },
);

const getAllCustomer = catchAsync(async (req: Request, res: Response) => {
  const paginationOptions = pick(req.query, paginationFields);
  const result = await CustomerService.getAllCustomer(paginationOptions);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All customer retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

//done
const getSingleCustomer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CustomerService.getSingleCustomer(id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Customer retrieved successfully',
    data: result,
  });
});

export const CustomerController = {
  getCustomerProfile,
  updateCustomerProfile,
  deleteCustomerProfile,
  getAllCustomer,
  getSingleCustomer,
};
