import { JwtPayload } from 'jsonwebtoken';

import { IPaginationOptions } from '../../../types/pagination';

import { IProfessional, IProfessionalFilters } from './professional.interface';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Professional } from './professional.model';
import { professionalSearchableFields } from './professional.constants';
import { Service } from '../service/service.model';
import { handleObjectUpdate } from './professional.utils';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../types/response';

const updateProfessionalProfile = async (
  user: JwtPayload,
  payload: Partial<IProfessional>,
) => {
  const { socialLinks, ...restData } = payload;

  let updatedData = { ...restData };
  if (socialLinks && Object.keys(socialLinks).length > 0) {
    updatedData = handleObjectUpdate(socialLinks, updatedData, 'socialLinks');
  }
  const result = await Professional.findOneAndUpdate(
    { _id: user.userId },
    updatedData,
    {
      new: true,
    },
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update profile!');
  }
};

const addPortfolioImageToDB = async (user: JwtPayload, payload: string[]) => {
  // Check if the user exists and is active
  const isUserExist = await Professional.findById(user.userId).populate(
    'auth',
    { status: 1 }, // Only select the status field from the referenced User
  );

  if (
    !isUserExist ||
    !isUserExist.auth ||
    isUserExist.auth.status !== 'active'
  ) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found or inactive!');
  }

  // Add new images to the portfolio, avoiding duplicates
  const uniqueNewImages = payload.filter(
    (image) => !isUserExist.portfolio.includes(image),
  );

  if (uniqueNewImages.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No new images to add!');
  }

  const result = await Professional.findByIdAndUpdate(
    user.userId,
    { $addToSet: { portfolio: { $each: uniqueNewImages } } },
    { new: true },
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update portfolio!');
  }

  return result;
};

const updatePortfolioImageToDB = async (
  user: JwtPayload,
  newImages: string[],
  removedImages: string[],
) => {
  const isUserExist = await Professional.findById(user.userId).populate(
    'auth',
    { status: 1 }, // Only select the status field from the referenced User
  );

  if (
    !isUserExist ||
    !isUserExist.auth ||
    isUserExist.auth.status !== 'active'
  ) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found or inactive!');
  }

  let updatedPortfolio = isUserExist.portfolio || [];

  if (removedImages.length > 0) {
    updatedPortfolio = updatedPortfolio.filter(
      (image) => !removedImages.includes(image),
    );
  }

  if (newImages.length > 0) {
    const uniqueNewImages = newImages.filter(
      (image) => !updatedPortfolio.includes(image),
    );
    updatedPortfolio.push(...uniqueNewImages);
  }

  const result = await Professional.findByIdAndUpdate(
    user.userId,
    { portfolio: updatedPortfolio },
    { new: true },
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update portfolio!');
  }

  return result;
};

const getBusinessInformationForProfessional = async (
  user: JwtPayload,
  payload: Partial<IProfessional>,
) => {
  const existingProfessional = await Professional.findById({
    _id: user.userId,
  }).populate('auth', { status: 1 });
  if (!existingProfessional) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Professional not found!');
  }

  const updatedFields: string[] = [];
  for (const key in payload) {
    if (
      Object.prototype.hasOwnProperty.call(payload, key) &&
      existingProfessional[key as keyof IProfessional] !==
        payload[key as keyof IProfessional]
    ) {
      updatedFields.push(key);
    }
  }

  const result = await Professional.findOneAndUpdate(
    { auth: user.id },
    payload,
    {
      new: true,
    },
  );

  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update business information',
    );
  }

  result.informationCount += 1;
  if (result.informationCount > 8) result.informationCount = 0;
  await result.save();

  return {
    updatedFields,
    informationCount: result.informationCount,
    result,
  };
};

const getProfessionalProfile = async (
  user: JwtPayload,
): Promise<IProfessional | null> => {
  const result = await Professional.findOne({ auth: user.id }).populate(
    'auth',
    { name: 1, email: 1, role: 1, status: 1 },
  );
  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Requested professional profile not found',
    );
  }
  //@ts-ignore
  if (result.auth.status === 'delete') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Requested professional profile has been deleted.',
    );
  }
  return result;
};

const deleteProfessionalProfile = async (user: JwtPayload) => {};

const getSingleProfessional = async (id: string) => {
  const result = await Professional.findById(id).populate('auth', {
    name: 1,
    email: 1,
    role: 1,
    status: 1,
  });
  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Requested professional not found',
    );
  }
  //@ts-ignore
  if (result.auth.status === 'delete') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Requested professional profile has been deleted.',
    );
  }
  return result;
};

const getAllProfessional = async (
  searchTerm: string,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const anyCondition: any[] = [];
  if (searchTerm) {
    const regex = new RegExp(searchTerm, 'i');

    const professionalsMatch = await Professional.find({
      $or: [
        { serviceType: regex },
        { targetAudience: regex },
        { businessName: regex },
        { address: regex },
        { description: regex },
      ],
    }).distinct('_id');

    // Search services collection
    const servicesMatch = await Service.find({
      $or: [{ title: regex }, { description: regex }],
    }).select('createdBy'); // Select the 'professional' field from Service collection

    // Collect matched professional IDs from both collections
    const professionalIds = professionalsMatch.map(
      (professional) => professional._id,
    );
    const serviceProfessionalIds = servicesMatch.map(
      (service) => service.createdBy,
    );

    // Combine the matched professional IDs
    const combinedIds = [
      ...new Set([...professionalIds, ...serviceProfessionalIds]),
    ];

    // Add the condition to search professionals that match any of the combined IDs
    anyCondition.push({ _id: { $in: combinedIds } });
  }

  // Further query conditions can be added to anyCondition array here if needed

  // Now, query the Professional collection using the anyCondition array
  const professionals = await Professional.find({ $and: anyCondition }) // Use $and to combine all conditions in the array
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy || 'createdAt']: sortOrder === 'desc' ? -1 : 1 });

  // Get total count for pagination metadata
  const total = await Professional.countDocuments({ $and: anyCondition });

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: professionals,
  };
};

export const ProfessionalService = {
  updateProfessionalProfile,
  getBusinessInformationForProfessional,
  getProfessionalProfile,
  deleteProfessionalProfile,
  getAllProfessional,
  getSingleProfessional,
  addPortfolioImageToDB,
  updatePortfolioImageToDB,
};
