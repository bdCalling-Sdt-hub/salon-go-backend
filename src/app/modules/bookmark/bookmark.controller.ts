import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IBookmark } from './bookmark.interface';
import { BookmarkService } from './bookmark.service';
import { Request, Response } from 'express';

const createBookmark = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const payload = req.body;
  const result = await BookmarkService.createBookmark(user, payload);
  sendResponse<IBookmark>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Bookmark created successfully',
    data: result,
  });
});

const getAllBookmarks = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user;
  const result = await BookmarkService.getAllBookmarks(id);
  sendResponse<IBookmark[] | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All bookmarks retrieved successfully',
    data: result,
  });
});

const removeBookmark = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  const result = await BookmarkService.removeBookmark(id, user);
  sendResponse<IBookmark | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Bookmark removed successfully',
    data: result,
  });
});

export const BookmarkController = {
  createBookmark,
  getAllBookmarks,
  removeBookmark,
};
