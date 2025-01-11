import express from 'express';

import { NotificationController } from './notification.controller';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL, USER_ROLES.ADMIN),
  NotificationController.createNotification,
);
router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL, USER_ROLES.ADMIN),
  NotificationController.getNotifications,
);

router.patch(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL, USER_ROLES.ADMIN),
  NotificationController.makeCountTrue,
);

router.get(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL, USER_ROLES.ADMIN),
  NotificationController.getSingleNotification,
);

export const NotificationRoutes = router;
