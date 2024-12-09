import { JwtPayload } from 'jsonwebtoken';

import { IPaginationOptions } from '../../../types/pagination';

import { IProfessional, IProfessionalFilters } from './professional.interface';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Professional } from './professional.model';
import { professionalSearchableFields } from './professional.constants';
import { Service } from '../service/service.model';

const updateProfessionalProfile = async (
  user: JwtPayload,
  payload: Partial<IProfessional>,
) => {};

const getBusinessInformationForProfessional = async (
  user: JwtPayload,
  payload: Partial<IProfessional>,
) => {
  // Find the existing professional document
  const existingProfessional = await Professional.findOne({ auth: user.id });
  if (!existingProfessional) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Professional not found!');
  }

  // Track updated fields
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

  // Update the professional's information
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

const getAllProfessional = async (
  filters: IProfessionalFilters,
  paginationOptions: IPaginationOptions,
) => {
  const {
    searchTerm,
    city,
    category,
    subCategory,
    subSubCategory,
    minPrice,
    maxPrice,
    date,
    sortBy,
    sortOrder,
  } = filters;

  // search with normal fields like address, businessName, description
  const andCondition = [];
  if (searchTerm) {
    andCondition.push({
      $or: professionalSearchableFields.map((field) => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }

  //search with category, subCategory, subSubCategory

  //filter with service price range and get the professional id's
  if (minPrice && maxPrice) {
    const query = { price: { $gte: minPrice, $lte: maxPrice } };
    const result = await Service.find(query);
  }

  if (city) {
    andCondition.push({
      $and: [
        {
          address: { regex: city, $options: 'i' },
        },
      ],
    });
  }

  //filter with available date and get the professional id's (slots check and open or close check)

  //filter with city

  //get the professionals
};

export const ProfessionalService = {
  updateProfessionalProfile,
  getBusinessInformationForProfessional,
  getProfessionalProfile,
  deleteProfessionalProfile,
  getAllProfessional,
};
