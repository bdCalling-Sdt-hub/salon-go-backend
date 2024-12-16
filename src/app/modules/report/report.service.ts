import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IReport, ReportModel } from './report.interface';
import { Report } from './report.model';
import { JwtPayload } from 'jsonwebtoken';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { USER_ROLES } from '../../../enums/user';

const createReportToDB = async (
  payload: IReport,
  user: JwtPayload,
): Promise<IReport> => {
  payload.reporterId = user.userId;
  const result = await Report.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create report');
  }
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
  if (isReportExist.reporterId.toString() !== user.userId) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
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
  const isReportExist = await Report.findById(reportId);
  if (!isReportExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Report not found!');
  }
  if (
    isReportExist.reporterId.toString() !== user.userId ||
    user.role !== USER_ROLES.ADMIN
  ) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
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
