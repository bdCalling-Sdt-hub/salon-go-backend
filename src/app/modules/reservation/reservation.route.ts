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
  '/update-status/:id',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  validateRequest(ReservationValidations.updateReservationZodSchema),
  ReservationController.updateReservationStatus,
);

// router.patch(
//   '/start-tracking/:id',
//   auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
//   ReservationController.startReservationTracking
// );

router.get(
  '/',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER, USER_ROLES.ADMIN),
  ReservationController.getReservationsForUsers,
);

export const ReservationRoutes = router;
