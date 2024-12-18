import express from 'express';
import { DashboardController } from './dashboard.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

router.get(
  '/general-stats',
  //   auth(USER_ROLES.ADMIN),
  DashboardController.getGeneralStats,
);

router.get(
  '/reservation-rates',
  //   auth(USER_ROLES.ADMIN),
  DashboardController.getReservationRate,
);

router.get(
  '/top-professionals',
  //   auth(USER_ROLES.ADMIN),
  DashboardController.getTopProfessionals,
);

router.get(
  '/professional-vs-freelancer',
  //   auth(USER_ROLES.ADMIN),
  DashboardController.getProfessionalVsFreelancer,
);

router.get(
  '/all-professional',
  //   auth(USER_ROLES.ADMIN),
  DashboardController.getAllProfessionalForAdmin,
);

router.get(
  '/all-customer',
  //   auth(USER_ROLES.ADMIN),
  DashboardController.getAllCustomerForAdmin,
);

router.get('/time-slots', DashboardController.getTimeSchedule);

export const DashboardRoutes = router;
