import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { ChatService } from './chat.service';

const accessChat = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { ...data } = req.body;
  const result = await ChatService.accessChat(user, data);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Chat accessed successfully',
    data: result,
  });
});

const getChatListByUserId = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await ChatService.getChatListByUserId(user);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Chat list retrieved successfully',
    data: result,
  });
});

export const ChatController = {
  accessChat,
  getChatListByUserId,
};
