import { StatusCodes } from 'http-status-codes';
import { IBookmark } from './bookmark.interface';
import { Bookmark } from './bookmark.model';
import ApiError from '../../../errors/ApiError';
import { JwtPayload } from 'jsonwebtoken';
import { Customer } from '../customer/customer.model';
import { Types } from 'mongoose';
const createOrRemoveBookmark = async (
  user: JwtPayload,
  payload: { professional: Types.ObjectId },
) => {
  let status;
  const isExist = await Bookmark.findOne({
    professional: payload.professional,
    customer: user.userId,
  });
  if (isExist) {
    await Bookmark.deleteOne({ _id: isExist._id });
    return `Bookmark removed successfully`;
  }
  const result = await Bookmark.create({
    customer: user.userId,
    professional: payload.professional,
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create bookmark');
  }
  return `Bookmark created successfully`;
};

const getAllBookmarks = async (id: string): Promise<IBookmark[] | null> => {
  const isCustomerExist = await Customer.findById({ _id: id }, { _id: 1 });
  if (!isCustomerExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Customer doesn't exist!");
  }

  const result = await Bookmark.find({
    customer: isCustomerExist._id,
  }).populate({
    path: 'professional',
    populate: {
      path: 'auth',
      select: {
        name: 1,
        email: 1,
        profile: 1,
      },
    },
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get bookmarks');
  }
  return result;
};

export const BookmarkService = {
  createOrRemoveBookmark,
  getAllBookmarks,
};
