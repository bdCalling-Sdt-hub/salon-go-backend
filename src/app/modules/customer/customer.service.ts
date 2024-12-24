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
import multer from 'multer';
import FileManager from '../../../helpers/awsS3Helper';
import { IUser } from '../user/user.interface';

const CustomerFileManager = new FileManager();

const getCustomerProfile = async (user: JwtPayload) => {
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
const updateCustomerProfile = async (
  user: JwtPayload,
  payload: Partial<ICustomer & IUser>,
) => {
  const session = await User.startSession();
  session.startTransaction();
  const { name, profile, ...restData } = payload;
  try {
    if (name || profile) {
      console.log(profile);
      await User.findByIdAndUpdate(
        { _id: user.id },
        { ...(name && { name }), ...(profile && { profile }) },
        { new: true, session },
      );
    }

    // Update the Customer profile
    const result = await Customer.findByIdAndUpdate(
      { _id: user.userId },
      restData,
      {
        new: true,
        session,
      },
    );

    if (!result) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update customer');
    }

    await session.commitTransaction();
    session.endSession();

    return result;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
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

const getSingleCustomer = async (id: string) => {
  const isDeleted = await User.findOne({ _id: id, status: 'delete' });
  if (isDeleted) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Customer account has been deleted',
    );
  }

  const result = await Customer.findOne(
    { _id: id },
    {
      address: 1,
      gender: 1,
      dob: 1,
      profile: 1,
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

  return result;
};

export const CustomerService = {
  getCustomerProfile,
  updateCustomerProfile,
  deleteCustomerProfile,

  getSingleCustomer,
};
