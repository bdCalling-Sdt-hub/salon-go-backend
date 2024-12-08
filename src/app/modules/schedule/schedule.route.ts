import express from 'express';
import { ScheduleController } from './schedule.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { ScheduleValidations } from './schedule.validation';

const router = express.Router();

router.post(
  '/create-schedule',
  auth(USER_ROLES.PROFESSIONAL),
  validateRequest(ScheduleValidations.createScheduleZodSchema),
  ScheduleController.createSchedule,
);

router.patch(
  '/update-schedule',

  auth(USER_ROLES.PROFESSIONAL),
  validateRequest(ScheduleValidations.updateScheduleZodSchema),
  ScheduleController.updateSchedule,
);

router.get(
  '/',
  auth(USER_ROLES.PROFESSIONAL),
  ScheduleController.getScheduleForProfessional,
);

export const ScheduleRoutes = router;
