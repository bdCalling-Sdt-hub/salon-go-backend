import express from 'express';
import { ReservationController } from './reservation.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { ReservationValidations } from './reservation.validation';

const router = express.Router();
router.get(
  '/:id',
  auth(USER_ROLES.PROFESSIONAL),
  ReservationController.getSingleReservation,
);
router.post(
  '/',
  auth(USER_ROLES.USER),
  validateRequest(ReservationValidations.reservationValidationZodSchema),
  ReservationController.createReservation,
);
router.get(
  '/',
  auth(USER_ROLES.PROFESSIONAL),
  ReservationController.getReservationsForProfessional,
);

export const ReservationRoutes = router;
