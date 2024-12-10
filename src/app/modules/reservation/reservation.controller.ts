import { Request, Response, NextFunction } from 'express';
import { ReservationServices } from './reservation.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { paginationHelper } from '../../../helpers/paginationHelper';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../types/pagination';
import { StatusCodes } from 'http-status-codes';

const createReservation = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await ReservationServices.createReservationToDB(payload);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reservation created successfully',
    data: result,
  });
});

const getReservationsForProfessional = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const filters = pick(req.query, ['status', 'subSubCategory']);
    const paginationOptions = pick(req.query, paginationFields);

    const result =
      await ReservationServices.getReservationForProfessionalFromDB(
        user,
        filters,
        paginationOptions,
      );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Reservations retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  },
);

const getSingleReservation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.user;
  const result = await ReservationServices.getSingleReservationFromDB(
    id,
    userId,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reservation retrieved successfully',
    data: result,
  });
});

export const ReservationController = {
  createReservation,
  getReservationsForProfessional,
  getSingleReservation,
};
