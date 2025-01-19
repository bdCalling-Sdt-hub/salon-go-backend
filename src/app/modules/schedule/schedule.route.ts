import express from 'express';
import { ScheduleController } from './schedule.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { ScheduleValidations } from './schedule.validation';

const router = express.Router();

router.patch(
  '/',
  auth(USER_ROLES.PROFESSIONAL),
  validateRequest(ScheduleValidations.updateScheduleZodSchema),
  ScheduleController.createSchedule,
);

// router.patch(
//   '/',

//   auth(USER_ROLES.PROFESSIONAL),
//   validateRequest(ScheduleValidations.updateScheduleZodSchema),
//   ScheduleController.updateSchedule,
// );

router.delete(
  '/:id',
  auth(USER_ROLES.PROFESSIONAL),
  ScheduleController.deleteSchedule,
);

router.get(
  '/',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  ScheduleController.getScheduleForProfessional,
);

router.get(
  '/professional/:id',
  auth(USER_ROLES.USER),
  ScheduleController.getScheduleForCustomer,
);
export const ScheduleRoutes = router;
