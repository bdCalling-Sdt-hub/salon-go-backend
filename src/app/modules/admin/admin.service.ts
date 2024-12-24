import { JwtPayload } from 'jsonwebtoken';
import { Admin } from './admin.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { IAdmin } from './admin.interface';
import { IUser } from '../user/user.interface';
import { User } from '../user/user.model';
import mongoose from 'mongoose';

const getAdminProfile = async (user: JwtPayload) => {
  const result = await Admin.findById({ _id: user.userId }).populate('auth');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Admin not found');
  }
  return result;
};

const updateAdminProfile = async (
  user: JwtPayload,
  payload: Partial<IAdmin & IUser>,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, profile, ...adminFields } = payload;

    // Fetch Admin document
    const admin = await Admin.findOne({ _id: user.userId }).session(session);
    if (!admin) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Admin not found');
    }

    if (name || profile) {
      const userUpdateResult = await User.findOneAndUpdate(
        { _id: user.id },
        { ...(name && { name }), ...(profile && { profile }) },
        { new: true, session },
      );
      if (!userUpdateResult) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Failed to update user profile',
        );
      }
    }

    // Update Admin fields if present
    if (Object.keys(adminFields).length > 0) {
      const adminUpdateResult = await Admin.findOneAndUpdate(
        { _id: user.userId },
        { name: name, ...adminFields },
        { new: true, session },
      );
      if (!adminUpdateResult) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Failed to update admin fields',
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    const updatedAdmin = await Admin.findOne({ id: user.userId });
    return updatedAdmin;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update admin profile',
    );
  }
};

export const AdminService = {
  getAdminProfile,
  updateAdminProfile,
};
