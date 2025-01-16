import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IReport, ReportModel } from './report.interface';
import { Report } from './report.model';
import { JwtPayload } from 'jsonwebtoken';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { USER_ROLES } from '../../../enums/user';
import {
  sendNotification,
  sendNotificationToMultipleRecipients,
} from '../../../helpers/sendNotificationHelper';
import { Types } from 'mongoose';

const createReportToDB = async (
  payload: IReport,
  user: JwtPayload,
): Promise<IReport> => {
  payload.reporterId = user.id;
  const result = await Report.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create report');
  }

  await sendNotificationToMultipleRecipients('getNotification', [
    {
      recipient: payload.reportedId,
      data: {
        userId: user.id,
        title: `You have been reported by someone.`,
        message: payload.reason,
        type: user.role,
      },
    },
    {
      recipient: 'ADMIN',
      data: {
        userId: new Types.ObjectId(),
        title: 'New report has been created',
        message: 'View reports and take necessary action.',
        type: 'ADMIN',
      },
    },
  ]);

  return result;
};

const updateReportToDB = async (
  reportId: string,
  payload: Partial<IReport>,
  user: JwtPayload,
): Promise<IReport | null> => {
  const isReportExist = await Report.findById(reportId);
  if (!isReportExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Report not found!');
  }
  if (isReportExist.reporterId.toString() !== user.id) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You are not authorized to update this report',
    );
  }

  const result = await Report.findByIdAndUpdate(reportId, payload, {
    new: true,
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update report');
  }
  return result;
};

const markReportResolvedToDB = async (
  reportId: string,
  payload: Pick<IReport, 'remark'>,
  user: JwtPayload,
): Promise<IReport | null> => {
  const isReportExist = await Report.findById(reportId)
    .populate({
      path: 'reportedId',
      populate: {
        path: 'auth',
        select: { name: 1, email: 1 },
      },
    })
    .populate({
      path: 'reporterId',
      populate: {
        path: 'auth',
        select: { name: 1, email: 1 },
      },
    });
  if (!isReportExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Report not found!');
  }
  if (
    isReportExist.reporterId.toString() !== user.id ||
    user.role !== USER_ROLES.ADMIN
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You are not authorized to resolved this report',
    );
  }

  const result = await Report.findByIdAndUpdate(
    reportId,
    {
      isResolved: true,
      remark: payload.remark,
      resolvedBy: user.role,
    },
    { new: true },
  );
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete report');
  }

  if (user.role === USER_ROLES.ADMIN) {
    await sendNotificationToMultipleRecipients('getNotification', [
      {
        recipient: isReportExist.reporterId,
        data: {
          userId: user.id,
          title: `Your report has been resolved by admin`,
          message: payload.remark,
          type: user.role,
        },
      },
      {
        recipient: isReportExist.reportedId,
        data: {
          userId: user.id,
          title: `Your report has been resolved by admin`,
          message: payload.remark,
          type: user.role,
        },
      },
    ]);
  }
  //@ts-ignore
  await sendNotification('getNotification', isReportExist.reportedId.auth._id, {
    userId: user.id,
    title: `Your report has been resolved by ${user.role}`,
    message: payload.remark,
    type: user.role,
  });
  return result;
};

const getSingleReportFromDB = async (reportId: string) => {
  const result = await Report.findById(reportId);

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get report');
  }
  return result;
};

//dashboard + app api
const getAllReportByUserIDFromDB = async (
  user: JwtPayload,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const result = await Report.find({ reportedId: user.userId })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Report.countDocuments({ reportedId: user.userId });

  return {
    meta: {
      total,
      page,
      totalPage: Math.ceil(total / limit),
      limit,
    },
    data: result,
  };
};

export const ReportServices = {
  createReportToDB,
  updateReportToDB,
  markReportResolvedToDB,
  getSingleReportFromDB,
  getAllReportByUserIDFromDB,
};
