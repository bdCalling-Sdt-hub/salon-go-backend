import { Request, Response, NextFunction } from 'express';
import { DashboardServices } from './dashboard.service';
import pick from '../../../shared/pick';
import { professionalDashboardFilterableFields } from './dashboard.constant';
import { paginationFields } from '../../../types/pagination';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';

const getGeneralStats = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardServices.getGeneralStats();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'General stats retrieved successfully',
    data: result,
  });
});

// const getAllProfessionals = catchAsync(async (req: Request, res: Response) => {
//   const user = req.user;
//   const filters = pick(req.query, professionalDashboardFilterableFields);
//   const paginationOptions = pick(req.query, paginationFields);
//   const result = await DashboardServices.getAllProfessionalForAdmin(
//     user,
//     filters,
//     paginationOptions,
//   );
//   sendResponse(res, {
//     success: true,
//     statusCode: StatusCodes.OK,
//     message: 'All professionals retrieved successfully',
//     data: result,
//   });
// });

const getTopProfessionals = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardServices.getTopProfessionals();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Top professionals retrieved successfully',
    data: result,
  });
});

const getReservationRate = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardServices.getReservationRate();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reservation rate retrieved successfully',
    data: result,
  });
});

const getProfessionalVsFreelancer = catchAsync(
  async (req: Request, res: Response) => {
    const result = await DashboardServices.getFreelancerVsProfessional();
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Professional vs Freelancer retrieved successfully',
      data: result,
    });
  },
);

const getAllProfessionalForAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const filters = pick(req.query, professionalDashboardFilterableFields);
    const paginationOptions = pick(req.query, paginationFields);
    const result = await DashboardServices.getAllProfessionalForAdmin(
      filters,
      paginationOptions,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'All professionals retrieved successfully',
      data: result,
    });
  },
);

const getAllCustomerForAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const filters = pick(req.query, professionalDashboardFilterableFields);
    const paginationOptions = pick(req.query, paginationFields);
    const result = await DashboardServices.getAllCustomerForAdmin(
      filters,
      paginationOptions,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'All customers retrieved successfully',
      data: result,
    });
  },
);

//------------

const getTimeSchedule = catchAsync(async (req: Request, res: Response) => {
  const { interval, startTime, endTime } = req.query;
  const result = await DashboardServices.generateTimeSlots(
    startTime! as string,
    endTime! as string,
    Number(interval)! as number,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Slots generated successfully.',
    data: result,
  });
});

export const DashboardController = {
  // getAllProfessionals,
  getReservationRate,
  getGeneralStats,
  getTopProfessionals,
  getProfessionalVsFreelancer,
  getAllProfessionalForAdmin,
  getAllCustomerForAdmin,
  //-------

  getTimeSchedule,
};
