import express from 'express';
import { ReservationController } from './reservation.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { ReservationValidations } from './reservation.validation';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.USER),
  validateRequest(ReservationValidations.reservationValidationZodSchema),
  ReservationController.createReservation,
);

router.get(
  '/:id',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER, USER_ROLES.ADMIN),
  ReservationController.getSingleReservation,
);

router.patch(
  '/confirm/:id',
  auth(USER_ROLES.PROFESSIONAL),
  validateRequest(ReservationValidations.confirmReservationZodSchema),
  ReservationController.confirmReservation,
);

router.patch(
  '/cancel/:id',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  ReservationController.cancelReservation,
);

router.patch(
  '/completed/:id',
  auth(USER_ROLES.PROFESSIONAL),
  ReservationController.markReservationAsCompleted,
);

router.patch(
  '/reject/:id',
  auth(USER_ROLES.PROFESSIONAL),
  ReservationController.rejectReservation,
);

router.get(
  '/',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER, USER_ROLES.ADMIN),
  ReservationController.getReservationsForUsers,
);

export const ReservationRoutes = router;
