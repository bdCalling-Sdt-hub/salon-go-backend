import { JwtPayload } from 'jsonwebtoken';
import { Admin } from './admin.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { IAdmin } from './admin.interface';
import { IUser } from '../user/user.interface';
import { User } from '../user/user.model';
import mongoose from 'mongoose';
import {
  deleteResourcesFromCloudinary,
  uploadToCloudinary,
} from '../../../utils/cloudinary';

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
  const { name, profile, ...adminFields } = payload;
  const { path } = profile as any;

  const userExist = await Admin.findById(user.userId).populate<{
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
      const uploadedImage = await uploadToCloudinary(path, 'admin', 'image');

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
      if (!userUpdateResult || (profile && userUpdateResult.profile !== uploadedImageUrl)) {
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
    const customerUpdateResult = await Admin.findByIdAndUpdate(
      { _id: user.userId },
      adminFields,
      { new: true, session },
    );

    if (!customerUpdateResult) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to update admin profile.',
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

export const AdminService = {
  getAdminProfile,
  updateAdminProfile,
};
