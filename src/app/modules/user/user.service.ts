/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { StatusCodes } from 'http-status-codes';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';

import { IUser, IUserFilters } from './user.interface';
import { User } from './user.model';
import mongoose, { SortOrder, Types } from 'mongoose';

import { userSearchableFields } from './user.constants';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../types/response';
import generateOTP from '../../../utils/generateOtp';
import { Admin } from '../admin/admin.model';
import { Customer } from '../customer/customer.model';
import { Professional } from '../professional/professional.model';
import { JwtPayload } from 'jsonwebtoken';
import { sendOtp } from '../../../helpers/twilio.helper';
import { Reservation } from '../reservation/reservation.model';

type IPayload = Pick<IUser & { businessName: string }, 'email' | 'password' | 'name' | 'role' | 'contact' | 'businessName'>;

const createUserToDB = async (payload: IPayload): Promise<IUser> => {
  const { ...user } = payload;

  let newUserData = null;
  let createdUser;

  //check if the user email exist with any active account
  const isExistUser = await User.findOne({
    $or: [
      { email: user.email },
      { contact: user.contact },
    ],
    status: { $in: ['active', 'restricted'] },
  });
  if (isExistUser) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'An account with this email or contact already exist. Please login',
    );
  }

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
      createdUser = await Professional.create([{ auth: newUser[0]._id, businessName: user.businessName }], {
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

    await session.commitTransaction();
    await session.endSession();
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    await session.endSession();
  }

  if (newUserData) {
    newUserData = await User.findOne({ _id: newUserData._id });
  }

  let authentication: { oneTimeCode: null; expireAt: Date | null } = {
    oneTimeCode: null,
    expireAt: null,
  };

  if (user.role === USER_ROLES.PROFESSIONAL) {
    //send onboarding email to professional
    const emailValue = {
      email: newUserData!.email,
      name: newUserData!.name,
      role: user.role,
    };
    const onboarding = emailTemplate.onboardingNewProfessional(emailValue);
    emailHelper.sendEmail(onboarding);
  }
  await User.findOneAndUpdate(
    { _id: newUserData!._id },
    { $set: { authentication } },
  );
  
  return newUserData!;
};

const getUserProfileFromDB = async (user: JwtPayload) => {
  let userData = null;

  if (user.role === USER_ROLES.ADMIN) {
    userData = await Admin.findOne({ _id: user.userId }).lean();
    if (!userData) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Admin doesn't exist!");
    }
  } else if (user.role === USER_ROLES.USER) {
    userData = await Customer.findOne(
      { _id: user.userId },
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
    userData = await Professional.findOne({ _id: user.userId }).populate({
      path: 'auth',
      select: { name: 1, email: 1, role: 1, status: 1, needInformation: 1 },
    });

    const [totalReservations, totalCompletedReservations] = await Promise.all([
      Reservation.countDocuments({
        professional: user.userId,
      }),
      Reservation.countDocuments({
        professional: user.userId,
        status: 'completed',
      }), 
    ]);
    
    userData = { ...userData, totalReservations, totalCompletedReservations };

    if (!userData) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Professional doesn't exist!");
    }
  } else {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user role!');
  }

  if (!userData) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
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

const restrictOrUnrestrictUser = async (id: Types.ObjectId) => {

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found');
  }
  if (user.status === 'restricted') {
    await User.findByIdAndUpdate(
      id,
      { $set: { status: 'active' } },
      {
        new: true,
      },
    )
    return `${user?.name} is un-restricted`;
  }
  const result = await User.findByIdAndUpdate(
    id,
    { $set: { status: 'restricted' } },
    {
      new: true,
    },
  );


  return `${result?.name} is restricted`;
};

const approveUser = async (id: Types.ObjectId) => {
  const result = await User.findByIdAndUpdate(
    id,
    { $set: { approvedByAdmin: true } },
    {
      new: true,
    },
  );

  const emailValue = {
    email: result!.email,
    name: result!.name,
  };
  const onboarding = emailTemplate.welcomeNewVerifiedProfessional(emailValue);
  emailHelper.sendEmail(onboarding);

  return `${result?.name} is approved`;
};


export const UserService = {
  createUserToDB,
  getUserProfileFromDB,
  getAllUser,

  restrictOrUnrestrictUser,
  approveUser,
};
