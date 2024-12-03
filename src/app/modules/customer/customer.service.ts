import { Types } from 'mongoose';
import { Customer } from './customer.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { User } from '../user/user.model';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../types/response';
import { ICustomer } from './customer.interface';
import { handleObjectUpdate } from '../../../utils/handleObjectUpdate';
import { JwtPayload } from 'jsonwebtoken';

const getCustomerProfile = async (user: JwtPayload) => {
  // const customerId = new Types.ObjectId(user.id);

  const isUserExist = await Customer.findOne(
    { auth: user.id },
    { address: 1, gender: 1, dob: 1 },
  ).populate({
    path: 'auth',
    select: {
      name: 1,
      email: 1,
      role: 1,
      status: 1,
    },
  });

  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Customer doesn't exist!");
  }
  //@ts-ignore
  if (isUserExist?.auth?.status === 'delete') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Customer profile has been deleted',
    );
  }

  return isUserExist;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateCustomerProfile = async (id: Types.ObjectId, payload: any) => {
  const { address, ...restData } = payload;
  let updatedData = { ...restData };
  if (address && Object.keys(address).length > 0) {
    updatedData = handleObjectUpdate(address, restData, 'address');
  }

  const isUserExist = await User.findById(id);
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  const result = await Customer.findOneAndUpdate({ auth: id }, updatedData, {
    new: true,
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update customer');
  }
  return result;
};

const deleteCustomerProfile = async (id: Types.ObjectId) => {
  const isUserExist = await User.findById(id);
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  const result = await User.findByIdAndUpdate(
    { _id: id },
    { status: 'delete' },
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete customer');
  }
  return 'Profile deleted successfully';
};

//Not needed for now
const getAllCustomer = async (
  paginationOption: IPaginationOptions,
): Promise<IGenericResponse<ICustomer[]>> => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOption);

  const result = await Customer.find({})
    .populate('auth')
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get all customer');
  }
  const total = await Customer.countDocuments();
  return {
    meta: {
      total: total,
      page,
      totalPage: Math.ceil(total / limit),
      limit,
    },
    data: result,
  };
};

const getSingleCustomer = async (id: string) => {
  const isDeleted = await User.findOne({ _id: id, status: 'delete' });
  if (isDeleted) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User has been deleted');
  }

  const result = await Customer.findOne(
    { _id: id },
    {
      address: 1,
      gender: 1,
      dob: 1,
      receivePromotionalNotification: 1,
    },
  ).populate({
    path: 'auth',
    select: {
      name: 1,
      email: 1,
      role: 1,
      status: 1,
    },
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get customer');
  }
  return result;
};

export const CustomerService = {
  getCustomerProfile,
  updateCustomerProfile,
  deleteCustomerProfile,
  getAllCustomer,
  getSingleCustomer,
};
