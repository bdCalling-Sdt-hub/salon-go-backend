import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { MessageValidation } from './message.validation';
import { MessageController } from './message.controller';

const router = express.Router();

router.post(
  '/send-message',
  auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    req.body.data
      ? (req.body = MessageValidation.sendMessageValidationSchema.parse(
          JSON.parse(req.body.data),
        ))
      : req.body;
    return MessageController.sendMessage(req, res, next);
  },
);
router.get(
  '/:chatId',
  auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL),
  MessageController.getMessagesByChatId,
);
export const MessageRoutes = router;
