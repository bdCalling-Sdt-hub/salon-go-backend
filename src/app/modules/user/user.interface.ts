/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { Model, Types } from 'mongoose'
import { ICustomer } from '../customer/customer.interface'
import { IAdmin } from '../admin/admin.interface'
import { USER_ROLES } from '../../../enums/user'
import { IProfessional } from '../professional/professional.interface'

export type IUser = {
  id: string
  email: string
  password: string
  customer?: Types.ObjectId | ICustomer
  professional?: Types.ObjectId | IProfessional
  admin?: Types.ObjectId | IAdmin
  role: USER_ROLES
  status: 'active' | 'restricted' | 'delete'
  needInformation: boolean
  approvedByAdmin: boolean
  verified: boolean
  termsAndCondition: boolean
  appId: string
  authentication?: {
    passwordChangedAt: Date
    isResetPassword: boolean
    oneTimeCode: number
    expireAt: Date
  }
}

export type UserModel = {
  isExistUserById(id: string): any
  isExistUserByEmail(email: string): any
  isMatchPassword(password: string, hashPassword: string): boolean
} & Model<IUser>

export type IUserFilters = {
  searchTerm?: string
  id?: string
  role?: string
  status?: string
}
