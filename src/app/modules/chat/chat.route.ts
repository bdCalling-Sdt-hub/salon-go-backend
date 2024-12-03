import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { ChatController } from './chat.controller';

const router = express.Router();

router.post(
  '/access-chat',
  auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL),
  ChatController.accessChat,
);
router.get('/:id', auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL));
router.get(
  '/chat-list',
  ChatController.getChatListByUserId,
  auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL),
);

export const ChatRoutes = router;
