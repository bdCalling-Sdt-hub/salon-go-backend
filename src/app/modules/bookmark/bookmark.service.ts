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

const getAllBookmarks = async (id: string) => {
  const isCustomerExist = await Customer.findById({ _id: id }, { _id: 1 });
  if (!isCustomerExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Customer doesn't exist!");
  }

  const result = await Bookmark.find({
    customer: isCustomerExist._id,
  },{rating:1, totalReviews:1, auth:1}).populate<{professional:{_id:Types.ObjectId,auth:{_id:Types.ObjectId,status:string, name:string, profile:string, email:string}}}>({
    path: 'professional',
    populate: {
      path: 'auth',
      select: {
        name: 1,
        email: 1,
        profile: 1,
        status:1
      },
    },
  }).lean();


  //return only the actives professionals
  const activeProfessionals = result.filter((bookmark) => {
    const professional = bookmark.professional;
    return professional.auth.status === 'active';
  });




  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get bookmarks');
  }


 

  return activeProfessionals;
};

export const BookmarkService = {
  createOrRemoveBookmark,
  getAllBookmarks,
};
