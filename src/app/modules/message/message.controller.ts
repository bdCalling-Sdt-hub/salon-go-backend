import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { MessageService } from './message.service';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../types/pagination';

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const chatId = req.params.id;

  const { ...messageData } = req.body;

  if (req.files && 'image' in req.files && req.files.image[0]) {
    messageData.image = req.files.image[0].path;
  }

  const result = await MessageService.sendMessage(messageData, chatId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Message sent successfully',
    data: result,
  });
});

const getMessagesByChatId = catchAsync(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const paginationOptions = pick(req.query, paginationFields);
  const result = await MessageService.getMessagesByChatId(
    chatId,
    paginationOptions,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Messages retrieved successfully',
    data: result,
  });
});

export const MessageController = {
  sendMessage,
  getMessagesByChatId,
};
