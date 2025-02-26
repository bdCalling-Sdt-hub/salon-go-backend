import { ClientSession } from 'mongoose';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Service } from '../service/service.model';
import { IProfessional } from './professional.interface';
import { Mongoose, Types } from 'mongoose';
import { User } from '../user/user.model';
import { IUser } from '../user/user.interface';
import { uploadToCloudinary } from '../../../utils/cloudinary';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
export const buildRangeFilter = (field: string, min?: number, max?: number) => {
  const rangeFilter: any = {};
  if (min !== undefined) rangeFilter.$gte = min;
  if (max !== undefined) rangeFilter.$lte = max;
  return Object.keys(rangeFilter).length > 0 ? { [field]: rangeFilter } : null;
};

//statistics
export const getDateRangeAndIntervals = (range: string) => {
  const months = parseInt(range, 10) || 1;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - months);

  const intervalDays = (months * 30) / 10;
  const intervalMilliseconds = intervalDays * 24 * 60 * 60 * 1000;

  const totalIntervals = Math.floor(
    (endDate.getTime() - startDate.getTime()) / intervalMilliseconds,
  );

  // Generate intervals with default value of 0
  const intervals = Array.from({ length: totalIntervals }, (_, i) => ({
    key: `${i * intervalDays + 1}-${(i + 1) * intervalDays}`,
    value: 0,
  }));

  return { startDate, endDate, intervals, intervalMilliseconds };
};

export const handleObjectUpdate = (
  payload: Record<string, any>,
  updatedData: Record<string, any>,
  prefix: string,
) => {
  if (payload && Object.keys(payload).length > 0) {
    Object.keys(payload).forEach((key) => {
      const updatedKey = `${prefix}.${key}`;

      updatedData[updatedKey] = payload[key];
    });
  }

  return updatedData;
};

export const uploadImageAndHandleRollback = async (
  image: any,
  folder: string,
  type: 'raw' | 'image',
) => {
  const uploadedImage = await uploadToCloudinary(image, folder, type);
  if (!uploadedImage || uploadedImage.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Failed to upload ${type}.`);
  }
  return uploadedImage[0];
};

export function getNextOnboardingStep(professional: IProfessional): string {

  if (!professional.serviceType) {
    return 'service-type';
  }

  if (professional.serviceType === 'in-place') {
    if (!professional.teamSize?.min || !professional.teamSize?.max) {
      return 'service-team-size';
    }
  } else if (professional.serviceType === 'home') {
    console.log(
      professional.serviceType,
      professional.travelFee?.fee,
      professional.travelFee?.distance,
    );
    if (
      professional.travelFee?.fee == null ||
      professional.travelFee?.distance == null
    ) {
      return 'service-travel-fee';
    }
  }

  if (!professional.categories || professional.categories.length === 0) {
    return 'category';
  }

  if (!professional.subCategories || professional.subCategories.length === 0) {
    return 'sub-category';
  }

  if (
    !professional.location ||
    professional.location.coordinates.every((coord) => coord === 0)
  ) {
    return 'address';
  }

  if (!professional.address) {
    return 'address';
  }
  console.log(professional);
  if (!professional.scheduleId) {
    return 'schedule';
  }

  if (!professional.helpingTags || professional.helpingTags.length === 0) {
    return 'helping-tags';
  }

  if (
    professional.previouslyUsedTools === undefined ||
    professional.previouslyUsedTools === null
  ) {
    return 'tools';
  }

  return 'thank-you'; // All necessary information is filled
}

export default getNextOnboardingStep;
