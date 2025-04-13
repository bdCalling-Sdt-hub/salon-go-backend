import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IBookmark } from './bookmark.interface';
import { BookmarkService } from './bookmark.service';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
const createOrRemoveBookmark = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const { id } = req.params;
  
    const result = await BookmarkService.createOrRemoveBookmark(user, {
      professional: new Types.ObjectId(id),
    });
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Bookmark created successfully',
      data: result,
    });
  },
);
const getAllBookmarks = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const result = await BookmarkService.getAllBookmarks(userId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All bookmarks retrieved successfully',
    data: result,
  });
});

export const BookmarkController = {
  createOrRemoveBookmark,
  getAllBookmarks,
};
