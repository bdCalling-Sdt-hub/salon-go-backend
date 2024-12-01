import { JwtPayload } from 'jsonwebtoken'
import { Admin } from './admin.model'
import ApiError from '../../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'

const getAdminProfile = async (user: JwtPayload) => {
  const result = await Admin.findOne({ id: user.userId })
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Admin not found')
  }
  return result
}

const deleteAdmin = async (user: JwtPayload) => {
  const result = await Admin.findOneAndDelete({ id: user.userId })
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete admin')
  }
  return result
}

export const AdminService = {
  getAdminProfile,
  deleteAdmin,
}
