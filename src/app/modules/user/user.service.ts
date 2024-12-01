/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { StatusCodes } from 'http-status-codes'
import { USER_ROLES } from '../../../enums/user'
import ApiError from '../../../errors/ApiError'
import { emailHelper } from '../../../helpers/emailHelper'
import { emailTemplate } from '../../../shared/emailTemplate'

import { IUser, IUserFilters } from './user.interface'
import { User } from './user.model'
import mongoose, { SortOrder } from 'mongoose'

import { userSearchableFields } from './user.constants'
import { IPaginationOptions } from '../../../types/pagination'
import { paginationHelper } from '../../../helpers/paginationHelper'
import { IGenericResponse } from '../../../types/response'
import generateOTP from '../../../utils/generateOtp'
import { generateCustomIdBasedOnRole } from './user.utils'
import { Admin } from '../admin/admin.model'
import { Customer } from '../customer/customer.model'
import { Professional } from '../professional/professional.model'

const createUserToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  const { ...user } = payload

  let newUserData = null
  let createdUser

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    const id = await generateCustomIdBasedOnRole(user?.role!)
    user.id = id as string

    if (user?.role === USER_ROLES.ADMIN) {
      createdUser = await Admin.create([user], { session })
      if (!createdUser?.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Admin')
      }

      //assign admin mongoDB id to user
      user.admin = createdUser[0]._id
    } else if (user?.role === USER_ROLES.USER) {
      createdUser = await Customer.create([user], { session })
      if (!createdUser?.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Customer')
      }

      //assign customer mongoDB id to user
      user.customer = createdUser[0]._id
    } else if (user?.role === USER_ROLES.PROFESSIONAL) {
      createdUser = await Professional.create([user], { session })
      if (!createdUser?.length) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to create professional'
        )
      }

      //assign professional mongoDB id to user
      user.professional = createdUser[0]._id
    }

    const newUser = await User.create([user], { session })
    if (!newUser?.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create User')
    }

    newUserData = newUser[0]

    await session.commitTransaction()
    session.endSession()
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }

  if (newUserData) {
    newUserData = await User.findOne({ _id: newUserData._id })
      .populate('admin')
      .populate('customer')
      .populate('professional')
  }

  //send email
  const otp = generateOTP()
  const values = {
    name: createdUser![0].name,
    otp: otp,
    email: newUserData!.email!,
  }

  const createAccountTemplate = emailTemplate.createAccount(values)
  emailHelper.sendEmail(createAccountTemplate)

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  }
  await User.findOneAndUpdate(
    { _id: newUserData!._id },
    { $set: { authentication } }
  )

  return newUserData!
}

const updateUser = async (
  id: string,
  payload: Partial<IUser>
): Promise<IUser | null> => {
  const isExistUser = await User.findOne({ id: id })
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!")
  }

  const updateDoc = await User.findOneAndUpdate({ id: id }, payload, {
    new: true,
  })

  return updateDoc
}

const getUserProfileFromDB = async (id: string): Promise<Partial<IUser>> => {
  const isExistUser = await User.findOne({ id: id })
    .populate('admin')
    .populate('customer')
    .populate('professional')
    .lean()
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!")
  }

  return isExistUser
}

const getAllUser = async (
  filters: IUserFilters,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IUser[]>> => {
  const { searchTerm, ...filtersData } = filters
  const { page, limit, skip, sortOrder, sortBy } =
    paginationHelper.calculatePagination(paginationOptions)
  const andCondition = []

  if (searchTerm) {
    andCondition.push({
      $or: userSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    })
  }
  if (Object.keys(filtersData).length) {
    andCondition.push({
      $and: Object.entries(filtersData).map(([field, value]) => {
        const parsedValue = Number(value)
        return {
          [field]: !isNaN(parsedValue) ? parsedValue : value,
        }
      }),
    })
  }

  const sortConditions: { [key: string]: SortOrder } = {}
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder
  }

  const whereConditions = andCondition.length > 0 ? { $and: andCondition } : {}

  const result = await User.find(whereConditions)
    .sort(sortConditions)
    .skip(skip)
    .limit(limit)
    .populate('admin')
    .populate('customer')
    .populate('professional')

  const total = await User.countDocuments(whereConditions)

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  }
}

const deleteUser = async (id: string): Promise<IUser | null> => {
  const isUserExists = await User.findOne({ id: id })
  if (!isUserExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!")
  }
  const updatedData = {
    status: 'delete',
  }

  const result = await User.findOneAndUpdate({ id: id }, updatedData, {
    new: true,
  })
  return result
}

export const UserService = {
  createUserToDB,
  getUserProfileFromDB,
  updateUser,
  getAllUser,
  deleteUser,
}
