import express from 'express';
import { ScheduleController } from './schedule.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { ScheduleValidations } from './schedule.validation';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.PROFESSIONAL),
  validateRequest(ScheduleValidations.createScheduleZodSchema),
  ScheduleController.createSchedule,
);

router.patch(
  '/',

  auth(USER_ROLES.PROFESSIONAL),
  validateRequest(ScheduleValidations.updateScheduleZodSchema),
  ScheduleController.updateSchedule,
);

router.delete(
  '/:id',
  auth(USER_ROLES.PROFESSIONAL),
  ScheduleController.deleteSchedule,
);

router.get('/:id', ScheduleController.getScheduleForProfessional);

export const ScheduleRoutes = router;
