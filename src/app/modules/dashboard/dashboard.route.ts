import express from 'express';
import { DashboardController } from './dashboard.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

router.get(
  '/general-stats',
  auth(USER_ROLES.ADMIN),
  DashboardController.getGeneralStats,
);

router.get(
  '/reservation-rates',
  auth(USER_ROLES.ADMIN),
  DashboardController.getReservationRate,
);

router.get(
  '/top-professionals',
  auth(USER_ROLES.ADMIN),
  DashboardController.getTopProfessionals,
);

router.get(
  '/professional-vs-freelancer',
  auth(USER_ROLES.ADMIN),
  DashboardController.getProfessionalVsFreelancer,
);

router.get(
  '/all-professional',
  // auth(USER_ROLES.ADMIN),
  DashboardController.getAllProfessionalForAdmin,
);

router.get(
  '/all-customer',
  auth(USER_ROLES.ADMIN),
  DashboardController.getAllCustomerForAdmin,
);

router.get(
  '/reservations',
  // auth(USER_ROLES.ADMIN),
  DashboardController.getAllReservations,
);

router.get(
  '/reservations/:id',
  // auth(USER_ROLES.ADMIN),
  DashboardController.getUserWiseReservations,
);

router.get(
  '/user-engagement',
  auth(USER_ROLES.ADMIN),
  DashboardController.getUserEngagement,
);
router.get(
  '/time-slots',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL),
  DashboardController.getTimeSchedule,
);

export const DashboardRoutes = router;
