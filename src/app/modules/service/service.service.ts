import { JwtPayload } from 'jsonwebtoken';
import { IService, ServiceModel } from './service.interface';
import { Service } from './service.model';
import { User } from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Professional } from '../professional/professional.model';
import { IUser } from '../user/user.interface';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { USER_ROLES } from '../../../enums/user';

const createServiceToDB = async (user: JwtPayload, payload: IService) => {
  const isUserExist = await Professional.findById(user.userId).populate<{
    auth: IUser;
  }>('auth', { status: 1, role: 1, approvedByAdmin: 1 });

  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Professional not found!');
  }
  if (isUserExist.auth.status === 'delete') {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Your account is not active');
  }


  if (
    isUserExist.auth.role === USER_ROLES.PROFESSIONAL &&
    !isUserExist.auth.approvedByAdmin
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Your account is not approved by admin, please submit your documents and wait for approval. If you have any questions, please contact us at 8wW8J@example.com',
    );
  }

  payload.category = isUserExist!.categories![0];
  const serviceData = { ...payload, createdBy: user.userId };
  const result = await Service.create([serviceData]);

  if (!result.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create service');
  }
  return result;
};

const updateServiceToDB = async (
  user: JwtPayload,
  id: string,
  payload: Partial<IService>,
) => {
  const isServiceExist = await Service.findById({
    _id: id,
    createdBy: user.userId,
  });

  if (!isServiceExist) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'You are not authorized to update this service',
    );
  }

  const result = await Service.findOneAndUpdate(
    { _id: id },
    { $set: { ...payload } },
    {
      new: true,
    },
  );
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update service');
  }
  return result;
};

const deleteServiceFromDB = async (user: JwtPayload, id: string) => {
  const isServiceExist = await Service.findById({
    _id: id,
    createdBy: user.userId,
  });

  if (!isServiceExist) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'You are not authorized to delete this service',
    );
  }

  const result = await Service.findOneAndDelete({ _id: id });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete service');
  }
  return result;
};

const getServicesByProfessionalIdFromDB = async (
  user: JwtPayload,
  filters: { subSubCategory?: string },
  id?: string,
  // paginationOptions: IPaginationOptions,
) => {
  // const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(paginationOptions);

  if (user.role === USER_ROLES.PROFESSIONAL) id = user.userId;

  const andCondition = [];

  if (filters.subSubCategory) {
    andCondition.push({
      subSubCategory: filters.subSubCategory,
    });
  }

  andCondition.push({
    createdBy: id,
  });
  console.log(andCondition, 'andCondition');
  const result = await Service.find({ $and: andCondition })
    .populate({
      path: 'createdBy',
      select: { auth: 1 },
      populate: {
        path: 'auth',
        select: { name: 1 },
      },
    })
    .populate({
      path: 'category',
      select: { name: 1 },
    })
    .populate({
      path: 'subCategory',
      select: { name: 1 },
    })
    .populate({
      path: 'subSubCategory',
      select: { name: 1 },
    });
  // .sort({ [sortBy]: sortOrder })
  // .skip(skip)
  // .limit(limit);

  // const total = await Service.countDocuments(andCondition);

  return result;
};

export const ServiceServices = {
  createServiceToDB,
  updateServiceToDB,
  deleteServiceFromDB,
  getServicesByProfessionalIdFromDB,
};
