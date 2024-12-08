import { JwtPayload } from 'jsonwebtoken';
import { IService, ServiceModel } from './service.interface';
import { Service } from './service.model';
import { User } from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Professional } from '../professional/professional.model';

const createServiceToDB = async (user: JwtPayload, payload: IService) => {
  const isUserExist = await User.findById({ _id: user.id, status: 'active' });
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Your account is not active');
  }
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
  const [isUserExist, isServiceExist] = await Promise.all([
    User.findById({ _id: user.id, status: 'active' }),
    Service.findById({ _id: id, createdBy: user.id }),
  ]);
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Your account is not active');
  }

  if (!isServiceExist) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'You are not authorized to update this service',
    );
  }

  const result = await Service.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update service');
  }
  return result;
};

const deleteServiceFromDB = async (user: JwtPayload, id: string) => {
  const [isUserExist, isServiceExist] = await Promise.all([
    User.findById({ _id: user.id, status: 'active' }),
    Service.findById({ _id: id, createdBy: user.id }),
  ]);
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }

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

const getServicesByProfessionalIdFromDB = async (id: string) => {
  const result = await Service.find({ createdBy: id })
    .populate({
      path: 'createdBy',
      select: { auth: 1 },
      populate: {
        path: 'auth',
        select: { name: 1, email: 1 },
      },
    })
    .populate({
      path: 'category',
      select: { name: 1 },
      populate: {
        path: 'subCategories',
        select: { name: 1 },
        populate: {
          path: 'subSubCategories',
          select: { name: 1 },
        },
      },
    });

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get services');
  }
  return result;
};

export const ServiceServices = {
  createServiceToDB,
  updateServiceToDB,
  deleteServiceFromDB,
  getServicesByProfessionalIdFromDB,
};
