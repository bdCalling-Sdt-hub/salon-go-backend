import { Request, Response, NextFunction } from 'express';
import { ReportServices } from './report.service';
import catchAsync from '../../../shared/catchAsync';
import { StatusCodes } from 'http-status-codes';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../types/pagination';

const createReport = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { ...report } = req.body;
  const result = await ReportServices.createReportToDB(report, user);
  res.status(StatusCodes.OK).json({
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Report created successfully',
    data: result,
  });
});

const updateReport = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ...payload } = req.body;
  const user = req.user;
  const result = await ReportServices.updateReportToDB(id, payload, user);
  res.status(StatusCodes.OK).json({
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Report updated successfully',
    data: result,
  });
});

const markReportAsResolved = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  const { remark } = req.body;
  const result = await ReportServices.markReportResolvedToDB(id, remark, user);
  res.status(StatusCodes.OK).json({
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Report marked as resolved successfully',
    data: result,
  });
});

const getAllReportByUserID = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const paginationOptions = pick(req.query, paginationFields);
  const result = await ReportServices.getAllReportByUserIDFromDB(
    user,
    paginationOptions,
  );
  res.status(StatusCodes.OK).json({
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Report retrieved successfully',
    data: result,
  });
});

const getSingleReport = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReportServices.getSingleReportFromDB(id);
  res.status(StatusCodes.OK).json({
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Report retrieved successfully',
    data: result,
  });
});

export const ReportController = {
  createReport,
  updateReport,
  markReportAsResolved,
  getAllReportByUserID,
  getSingleReport,
};
