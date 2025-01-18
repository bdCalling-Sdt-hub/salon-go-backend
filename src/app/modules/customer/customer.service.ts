import { Types } from 'mongoose';
import { Customer } from './customer.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { User } from '../user/user.model';
import { ICustomer } from './customer.interface';
import { JwtPayload } from 'jsonwebtoken';
import { IUser } from '../user/user.interface';
import {
  deleteResourcesFromCloudinary,
  uploadToCloudinary,
} from '../../../utils/cloudinary';

const getCustomerProfile = async (user: JwtPayload) => {
  const isUserExist = await Customer.findById(
    { _id: user.userId },
    { address: 1, gender: 1, dob: 1 },
  ).populate({
    path: 'auth',
    select: {
      name: 1,
      email: 1,
      role: 1,
      contact: 1,
      status: 1,
      profile: 1,
    },
  });

  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Customer doesn't exist!");
  }

  return isUserExist;
};

const updateCustomerProfile = async (
  user: JwtPayload,
  payload: Partial<ICustomer & IUser>,
) => {
  const session = await User.startSession();
  session.startTransaction();

  const { name, profile, ...restData } = payload;

  const { path } = profile as any;

  const userExist = await Customer.findById(user.userId).populate<{
    auth: IUser;
  }>({
    path: 'auth',
    select: {
      profile: 1,
    },
  });

  if (!userExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Customer doesn't exist!");
  }

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
      if (!userUpdateResult || userUpdateResult.profile !== uploadedImageUrl) {
        if (uploadedImageUrl) {
          await deleteResourcesFromCloudinary(uploadedImageUrl, 'image', true);
        }
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to update user profile.',
        );
      }

      //delete the previous image from cloudinary
      const { profile: oldProfile } = userExist.auth;
      if (oldProfile) {
        await deleteResourcesFromCloudinary(
          userExist.auth.profile,
          'image',
          true,
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
    throw error;
  } finally {
    session.endSession();
  }
};

const getSingleCustomer = async (id: string) => {
  const customer = await Customer.findById(id).populate<{ auth: IUser }>({
    path: 'auth',
    select: {
      name: 1,
      email: 1,
      profile: 1,
      status: 1,
    },
  });

  if (!customer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Customer not found!');
  }

  if (customer.auth.status === 'delete') {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Customer account has been deleted!',
    );
  }

  return customer;
};

export const CustomerService = {
  getCustomerProfile,
  updateCustomerProfile,

  getSingleCustomer,
};
