import { Request, Response, NextFunction } from 'express';
import { InvitationServices } from './invitation.service';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';

const sendInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;
  const payload = req.body;
  const result = await InvitationServices.sendInvitation(payload, user);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Invitation sent successfully',
    data: result,
  });
};

export const InvitationController = {
  sendInvitation,
};
