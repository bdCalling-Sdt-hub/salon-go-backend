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
import {
  deleteResourcesFromCloudinary,
  uploadToCloudinary,
} from '../../../utils/cloudinary';

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateCustomerProfile = async (
  user: JwtPayload,
  payload: Partial<ICustomer & IUser>,
) => {
  const session = await User.startSession();
  session.startTransaction();

  const { name, profile, ...restData } = payload;

  const { path } = profile as any;

  try {
    // 🖼️ Handle image upload if profile exists
    let uploadedImageUrl: string | null = null;
    if (path) {
      const uploadedImage = await uploadToCloudinary(path, 'customer', 'image');

      if (!uploadedImage || uploadedImage.length === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to upload image.');
      }

      uploadedImageUrl = uploadedImage[0];
    }

    // 📝 Update User Profile
    if (name || uploadedImageUrl) {
      const userUpdateResult = await User.findByIdAndUpdate(
        { _id: user.id },
        {
          $set: {
            ...(name && { name }),
            ...(uploadedImageUrl && { profile: uploadedImageUrl }),
          },
        },
        { new: true, session },
      );

      // Rollback uploaded image if User update fails
      if (!userUpdateResult) {
        if (uploadedImageUrl) {
          await deleteResourcesFromCloudinary(uploadedImageUrl, 'image', true);
        }
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to update user profile.',
        );
      }
    }

    // 📝 Update Customer Profile
    const customerUpdateResult = await Customer.findByIdAndUpdate(
      { _id: user.userId },
      restData,
      { new: true, session },
    );

    if (!customerUpdateResult) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to update customer profile.',
      );
    }

    // ✅ Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    return customerUpdateResult;
  } catch (error) {
    // ❌ Rollback the transaction on failure
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
