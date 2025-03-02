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

  const { name, profile,email, ...restData } = payload;

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
    let uploadedImageUrl: string | null = null;

    // Check if profile image is provided
    if (profile) {

      const uploadedImage = await uploadToCloudinary(profile, 'customer', 'image');

      if (!uploadedImage || uploadedImage.length === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to upload image.');
      }

      uploadedImageUrl = uploadedImage[0];
    }

    // 📝 Update User Profile
    if (name || uploadedImageUrl) {

      const userUpdatedData: Partial<IUser>  = {
        ...(name && { name }),
        ...(uploadedImageUrl && { profile: uploadedImageUrl }),
      };

      if (email) {
        //check if email already exist in database
        const isEmailExist = await User.findOne({
          email,
          _id: { $ne: user.id },
        });
        if (isEmailExist) {
          throw new ApiError(StatusCodes.BAD_REQUEST, 'An account with this email already exist.');
        }
        userUpdatedData.email = email;
      }

      const userUpdateResult = await User.findByIdAndUpdate(
        user.id,
        {
          $set: userUpdatedData,
        },
        { new: true, session },
      );

      if (!userUpdateResult || (profile && userUpdateResult.profile !== uploadedImageUrl)) {
        // If image update fails, delete the uploaded image
        if (uploadedImageUrl) {
          await deleteResourcesFromCloudinary(uploadedImageUrl, 'image', true);
        }
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to update user profile.',
        );
      }

      const { profile: oldProfile } = userExist.auth;
      if (oldProfile) {
        await deleteResourcesFromCloudinary(userExist.auth.profile, 'image', true);
      }
    }

    // 📝 Update customer data, excluding profile if not provided
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

    await session.commitTransaction();
    await session.endSession();

    return customerUpdateResult;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
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
