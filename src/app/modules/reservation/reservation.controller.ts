import { Request, Response, NextFunction } from 'express';
import { ReservationServices } from './reservation.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { paginationHelper } from '../../../helpers/paginationHelper';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../types/pagination';
import { StatusCodes } from 'http-status-codes';
import { reservationFilterableFields } from './reservation.constants';
import { Types } from 'mongoose';

const updateReservationStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const payload = req.body;
    const user = req.user;
    const result = await ReservationServices.updateReservationStatusToDB(
      new Types.ObjectId(id),
      payload,
      user,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Reservation status updated successfully',
      data: result,
    });
  },
);

const createReservation = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user;
  const result = await ReservationServices.createReservationToDB(payload, user);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reservation created successfully',
    data: result,
  });
});

const getReservationsForUsers = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const filters = pick(req.query, reservationFilterableFields);
    const paginationOptions = pick(req.query, paginationFields);

    const result = await ReservationServices.getReservationsForUsersFromDB(
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
  getReservationsForUsers,
  getSingleReservation,

  updateReservationStatus,
};
