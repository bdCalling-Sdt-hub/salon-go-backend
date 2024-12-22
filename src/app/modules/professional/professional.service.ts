import { JwtPayload } from 'jsonwebtoken';
import { parse } from 'date-fns';
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
import { Types } from 'mongoose';
import { QueryHelper } from '../../../utils/queryHelper';
import { Schedule } from '../schedule/schedule.model';
import { User } from '../user/user.model';
import { IUser } from '../user/user.interface';

const updateProfessionalProfile = async (
  user: JwtPayload,
  payload: Partial<IProfessional & IUser>,
) => {
  const { name, socialLinks, ...restData } = payload;

  const session = await Professional.startSession();
  session.startTransaction();

  try {
    if (name) {
      await User.findByIdAndUpdate(
        { _id: user.userId },
        { name },
        { new: true, session },
      );
    }

    let updatedData = { ...restData };
    if (socialLinks && Object.keys(socialLinks).length > 0) {
      updatedData = handleObjectUpdate(socialLinks, updatedData, 'socialLinks');
    }

    // Update the `Professional` profile
    const result = await Professional.findByIdAndUpdate(
      { _id: user.userId },
      updatedData,
      { new: true, session },
    );

    if (!result) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update profile!');
    }

    await session.commitTransaction();
    session.endSession();

    return result;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
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
    //@ts-ignore
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
    //@ts-ignore
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
  const existingProfessional = await Professional.findOne({
    auth: new Types.ObjectId(user.id),
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

  console.log(payload);

  const result = await Professional.findOneAndUpdate(
    { auth: new Types.ObjectId(user.id) },
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
    profile: 1,
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
  filterOptions: IProfessionalFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const {
    searchTerm,
    category,
    subCategory,
    subSubCategory,
    date,
    minPrice,
    maxPrice,
    city,
  } = filterOptions;
  console.log(filterOptions);
  const anyCondition: any[] = [];
  if (searchTerm) {
    const regex = new RegExp(searchTerm, 'i');

    if (city) {
      anyCondition.push({ address: { $regex: city, $options: 'i' } });
    }
    // Run queries in parallel
    const [professionalsMatch, servicesMatch] = await Promise.all([
      Professional.find({
        $or: [
          { serviceType: regex },
          { targetAudience: regex },
          { businessName: regex },
          { address: regex },
          { description: regex },
        ],
      }).distinct('_id'),
      Service.find({
        $or: [{ title: regex }, { description: regex }],
      }).select('createdBy'),
    ]);

    const combinedIds = [
      ...new Set([
        ...professionalsMatch,
        ...servicesMatch.map((service) => service.createdBy),
      ]),
    ];

    anyCondition.push({ _id: { $in: combinedIds } });
  }

  if (category || subCategory || subSubCategory) {
    // Prepare the filter conditions
    const filterConditions = [];

    if (category) {
      filterConditions.push({ category: category });
    }

    if (subCategory) {
      filterConditions.push({ subCategory: subCategory });
    }

    if (subSubCategory) {
      filterConditions.push({ subSubCategory: subSubCategory });
    }
    console.log(filterConditions);
    const servicesWithConditions = await Service.find(
      { $or: filterConditions },
      {
        createdBy: 1,
      },
    ).distinct('createdBy');

    anyCondition.push({ _id: { $in: servicesWithConditions } });
  }

  if (minPrice && maxPrice) {
    const priceFilterCondition = QueryHelper.rangeQueryHelper(
      'price',
      minPrice,
      maxPrice,
    );
    const servicesWithBudget = await Service.find(
      priceFilterCondition,
    ).distinct('createdBy');

    anyCondition.push({ _id: { $in: servicesWithBudget } });
  }

  if (date) {
    const requestedDay = parse(
      date,
      'dd-MM-yyyy',
      new Date(),
    ).toLocaleDateString('en-US', { weekday: 'long' });

    const availableProfessionals = await Schedule.find({
      days: { day: requestedDay },
    }).distinct('professional');

    anyCondition.push({ _id: { $in: availableProfessionals } });
  }

  const activeProfessional = await User.find(
    {
      status: 'active',
    },
    '_id',
  ).distinct('_id');

  anyCondition.push({ auth: { $in: activeProfessional } });

  const professionals = await Professional.find({ $and: anyCondition })
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy || 'createdAt']: sortOrder === 'desc' ? -1 : 1 });

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
