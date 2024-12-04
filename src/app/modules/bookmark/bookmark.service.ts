import { StatusCodes } from 'http-status-codes';
import { IBookmark } from './bookmark.interface';
import { Bookmark } from './bookmark.model';
import ApiError from '../../../errors/ApiError';
import { JwtPayload } from 'jsonwebtoken';
import { Customer } from '../customer/customer.model';

const createBookmark = async (
  user: JwtPayload,
  payload: IBookmark,
): Promise<IBookmark> => {
  payload.customer = user.userId;

  const createBookmark = await Bookmark.create(payload);
  if (!createBookmark) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create bookmark');
  }
  return createBookmark;
};

const getAllBookmarks = async (id: string): Promise<IBookmark[] | null> => {
  const isCustomerExist = await Customer.findOne({ auth: id }, { _id: 1 });
  if (!isCustomerExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Customer doesn't exist!");
  }
  console.log(isCustomerExist);
  const result = await Bookmark.find({
    customer: isCustomerExist._id,
  }).populate('professional');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get bookmarks');
  }
  return result;
};

const removeBookmark = async (
  id: string,
  user: JwtPayload,
): Promise<IBookmark | null> => {
  const removeBookmark = await Bookmark.findOneAndDelete({
    _id: id,
    customer: user.userId,
  });
  console.log(user.userId);
  if (!removeBookmark) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to remove bookmark');
  }
  return removeBookmark;
};

export const BookmarkService = {
  createBookmark,
  removeBookmark,
  getAllBookmarks,
};
