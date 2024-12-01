import { Request, Response } from 'express'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'
import { AdminService } from './admin.service'

const getAdminProfile = catchAsync(async (req: Request, res: Response) => {
  const admin = req.user

  const result = await AdminService.getAdminProfile(admin)
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Admin profile retrieved successfully',
    data: result,
  })
})

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
  const admin = req.user
  const result = await AdminService.deleteAdmin(admin)
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Admin deleted successfully',
    data: result,
  })
})

export const AdminController = {
  getAdminProfile,
  deleteAdmin,
}
