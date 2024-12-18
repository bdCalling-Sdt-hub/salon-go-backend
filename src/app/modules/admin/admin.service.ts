import { JwtPayload } from 'jsonwebtoken';
import { Admin } from './admin.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { IAdmin } from './admin.interface';
import { IUser } from '../user/user.interface';
import { User } from '../user/user.model';

const getAdminProfile = async (user: JwtPayload) => {
  const result = await Admin.findOne({ _id: user.userId }).populate('auth');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Admin not found');
  }
  return result;
};

const updateAdminProfile = async (
  user: JwtPayload,
  payload: Partial<IAdmin & IUser>,
) => {
  const { name, profile, ...adminFields } = payload;

  if (name || profile) {
    await User.findOneAndUpdate(
      { _id: user.id },
      { name, profile },
      { new: true },
    );
  }

  const result = await Admin.findOne({ id: user.userId });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Admin not found');
  }

  if (Object.keys(adminFields).length > 0) {
    await Admin.findOneAndUpdate({ _id: user.userId }, adminFields, {
      new: true,
    });
  }

  // Return the updated admin document
  return result;
};

export const AdminService = {
  getAdminProfile,
  updateAdminProfile,
};
