import {
  IPaginationOptions,
  paginationFields,
} from './../../../types/pagination';
import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { ReviewService } from './review.service';
import pick from '../../../shared/pick';

const createReview = catchAsync(async (req: Request, res: Response) => {
  const reviewData = req.body;
  const user = req.user;
  const result = await ReviewService.createReviewToDB(user, reviewData);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review created successfully',
    data: result,
  });
});

const getReviewsByProfessionalId = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const paginationOptions = pick(req.query, paginationFields);
    const result = await ReviewService.getReviewsByProfessionalIdFromDB(
      id,
      paginationOptions,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Reviews retrieved successfully',
      data: result,
    });
  },
);

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReviewService.deleteReviewFromDB(id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review deleted successfully',
    data: result,
  });
});
export const ReviewController = {
  createReview,
  getReviewsByProfessionalId,
  deleteReview,
};
