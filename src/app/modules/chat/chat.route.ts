import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { ChatController } from './chat.controller';
import validateRequest from '../../middlewares/validateRequest';
import { ChatValidation } from './chat.validation';

const router = express.Router();

router.post(
  '/access-chat',
  auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL),
  validateRequest(ChatValidation.accessChatSchema),
  ChatController.accessChat,
);
router.get('/:id', auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL));
router.get(
  '/chat-list',
  ChatController.getChatListByUserId,
  auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL),
);

export const ChatRoutes = router;
