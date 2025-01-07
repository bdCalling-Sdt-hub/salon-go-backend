//Privacy Policy

import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Banner, FaQs, PrivacyPolicy, TermsAndCondition } from './others.model';
import {
  IBanner,
  IFaQs,
  IPrivacyPolicy,
  ITermsAndConditions,
} from './others.interface';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';

const addBanner = async (payload: IBanner, user: JwtPayload) => {
  payload.createdBy = user.userId;
  const result = await Banner.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to add banner');
  }
  return result;
};

const getBanners = async (user: JwtPayload) => {
  const result = await Banner.find().sort({ createdAt: -1 });
  if (user.role === USER_ROLES.ADMIN) {
    return result;
  }
  const groupedImages = result.reduce<string[][]>((acc, banner, index) => {
    const groupIndex = Math.floor(index / 2);
    if (!acc[groupIndex]) {
      acc[groupIndex] = [];
    }
    acc[groupIndex].push(banner.imgUrl);
    return acc;
  }, []);

  return groupedImages;
};

const getSingleBanner = async (id: string): Promise<IBanner | null> => {
  const result = await Banner.findById(id);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get banner');
  }
  return result;
};

const updateBanner = async (id: string, payload: Partial<IBanner>) => {
  const result = await Banner.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update banner');
  }
  return result;
};

const createPrivacyPolicy = async (
  payload: IPrivacyPolicy,
): Promise<IPrivacyPolicy | null> => {
  const isExist = await PrivacyPolicy.findOne({ userType: payload.userType });
  if (isExist) {
    await PrivacyPolicy.findOneAndUpdate(
      { userType: payload.userType },
      payload,
    );
  }
  const result = await PrivacyPolicy.create(payload);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create privacy policy',
    );
  }
  return result;
};

const createTermsAndConditions = async (
  payload: ITermsAndConditions,
): Promise<ITermsAndConditions | null> => {
  const isExist = await TermsAndCondition.findOne({
    userType: payload.userType,
  });
  if (isExist) {
    await TermsAndCondition.findOneAndUpdate(
      { userType: payload.userType },
      payload,
    );
  }

  const result = await TermsAndCondition.create(payload);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create terms and conditions',
    );
  }
  return result;
};

const createFaQs = async (payload: IFaQs): Promise<IFaQs | null> => {
  const isExist = await FaQs.findOne({ userType: payload.userType });
  if (isExist) {
    await FaQs.findOneAndUpdate({ userType: payload.userType }, payload);
  }

  const result = await FaQs.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create FaQs');
  }
  return result;
};

//need to update
const getPrivacyPolicy = async (
  type: string,
): Promise<IPrivacyPolicy | null> => {
  const result = await PrivacyPolicy.findOne({ userType: type });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get privacy policy');
  }
  return result;
};

const getTermsAndConditions = async (
  type: string,
): Promise<ITermsAndConditions | null> => {
  const result = await TermsAndCondition.findOne({ userType: type });
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to get terms and conditions',
    );
  }
  return result;
};

const getFaQs = async (type: string): Promise<IFaQs | null> => {
  const result = await FaQs.findOne({ userType: type });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get FaQs');
  }
  return result;
};

const deletePrivacyPolicy = async (id: string) => {
  const result = await PrivacyPolicy.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to delete privacy policy',
    );
  }
  return result;
};

const deleteTermsAndConditions = async (id: string) => {
  const result = await TermsAndCondition.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to delete terms and conditions',
    );
  }
  return result;
};

const deleteFaQs = async (id: string) => {
  const result = await FaQs.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete FaQs');
  }
  return result;
};

const deleteBanner = async (id: string) => {
  const result = await Banner.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete banner');
  }
  return result;
};

export const OthersService = {
  createPrivacyPolicy,
  getPrivacyPolicy,
  deletePrivacyPolicy,
  createTermsAndConditions,
  getTermsAndConditions,
  deleteTermsAndConditions,
  createFaQs,
  getFaQs,
  deleteFaQs,
  addBanner,
  getBanners,
  updateBanner,
  getSingleBanner,
  deleteBanner,
};
