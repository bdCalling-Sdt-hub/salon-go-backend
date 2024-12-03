/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { StatusCodes } from 'http-status-codes';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';

import { IUser, IUserFilters } from './user.interface';
import { User } from './user.model';
import mongoose, { SortOrder } from 'mongoose';

import { userSearchableFields } from './user.constants';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../types/response';
import generateOTP from '../../../utils/generateOtp';
import { Admin } from '../admin/admin.model';
import { Customer } from '../customer/customer.model';
import { Professional } from '../professional/professional.model';
import { JwtPayload } from 'jsonwebtoken';

type IPayload = Pick<IUser, 'email' | 'password' | 'name' | 'role' | 'contact'>;

const createUserToDB = async (payload: IPayload): Promise<IUser> => {
  const { ...user } = payload;

  let newUserData = null;
  let createdUser;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const newUser = await User.create([user], { session });
    if (!newUser?.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create User');
    }

    if (user.role === USER_ROLES.ADMIN) {
      createdUser = await Admin.create([{ auth: newUser[0]._id }], { session });
    } else if (user.role === USER_ROLES.PROFESSIONAL) {
      createdUser = await Professional.create([{ auth: newUser[0]._id }], {
        session,
      });
    } else {
      createdUser = await Customer.create([{ auth: newUser[0]._id }], {
        session,
      });
    }

    if (!createdUser.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create User');
    }

    newUserData = newUser[0];
    console.log(newUserData);

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  if (newUserData) {
    newUserData = await User.findOne({ _id: newUserData._id });
  }

  //send email
  const otp = generateOTP();
  const values = {
    name: newUserData!.name,
    otp: otp,
    email: newUserData!.email!,
  };

  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  await User.findOneAndUpdate(
    { _id: newUserData!._id },
    { $set: { authentication } },
  );

  return newUserData!;
};

const updateUser = async (
  id: string,
  payload: Partial<IUser>,
): Promise<IUser | null> => {
  const isExistUser = await User.findOne({ id: id });
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  const updateDoc = await User.findOneAndUpdate({ id: id }, payload, {
    new: true,
  });

  return updateDoc;
};

const getUserProfileFromDB = async (user: JwtPayload) => {
  let userData = null;

  const isUserExists = await User.findOne({ _id: user.id, status: 'active' });
  if (!isUserExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  console.log(user.role);
  console.log(isUserExists, 'isUserExists');
  if (user.role === USER_ROLES.ADMIN) {
    userData = await Admin.findOne({ auth: user.id }).lean();
    if (!userData) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Admin doesn't exist!");
    }
  } else if (user.role === USER_ROLES.USER) {
    userData = await Customer.findOne(
      { auth: user.id },
      { address: 1, gender: 1, dob: 1, receivePromotionalNotification: 1 },
    )
      .populate({
        path: 'auth',
        select: { name: 1, email: 1, role: 1, status: 1, needInformation: 1 },
      })
      .lean();
    if (!userData) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Customer doesn't exist!");
    }
  } else if (user.role === USER_ROLES.PROFESSIONAL) {
    userData = await Professional.findOne({ auth: user.id }).populate({
      path: 'auth',
      select: { name: 1, email: 1, role: 1, status: 1, needInformation: 1 },
    });
    console.log(userData);
    if (!userData) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Professional doesn't exist!");
    }
  } else {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user role!');
  }

  return userData;
};

const getAllUser = async (
  filters: IUserFilters,
  paginationOptions: IPaginationOptions,
): Promise<IGenericResponse<IUser[]>> => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, sortOrder, sortBy } =
    paginationHelper.calculatePagination(paginationOptions);
  const andCondition = [];

  if (searchTerm) {
    andCondition.push({
      $or: userSearchableFields.map((field) => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }
  if (Object.keys(filtersData).length) {
    andCondition.push({
      $and: Object.entries(filtersData).map(([field, value]) => {
        const parsedValue = Number(value);
        return {
          [field]: !isNaN(parsedValue) ? parsedValue : value,
        };
      }),
    });
  }

  const sortConditions: { [key: string]: SortOrder } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }

  const whereConditions = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await User.find(whereConditions)
    .sort(sortConditions)
    .skip(skip)
    .limit(limit)
    .populate('admin')
    .populate('customer')
    .populate('professional');

  const total = await User.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

const deleteUser = async (id: string): Promise<IUser | null> => {
  const isUserExists = await User.findOne({ id: id });
  if (!isUserExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }
  const updatedData = {
    status: 'delete',
  };

  const result = await User.findOneAndUpdate({ id: id }, updatedData, {
    new: true,
  });
  return result;
};

export const UserService = {
  createUserToDB,
  getUserProfileFromDB,
  updateUser,
  getAllUser,
  deleteUser,
};
