import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { MessageService } from './message.service';

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { ...messageData } = req.body;

  let image;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    image = `/images/${req.files.image[0].filename}`;
  }
  messageData.image = image;

  const result = await MessageService.sendMessage(user, messageData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Message sent successfully',
    data: result,
  });
});

const getMessagesByChatId = catchAsync(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const result = await MessageService.getMessagesByChatId(chatId);

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
