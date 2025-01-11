import express from 'express';
import { ReportController } from './report.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { ReportValidations } from './report.validation';

const router = express.Router();
router.post(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL),
  validateRequest(ReportValidations.createReportZodSchema),
  ReportController.createReport,
);
router.patch(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.PROFESSIONAL),
  validateRequest(ReportValidations.updateReportZodSchema),
  ReportController.updateReport,
);

router.patch(
  '/resolved/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  validateRequest(ReportValidations.resolveReportZodSchema),
  ReportController.markReportAsResolved,
);

router.get(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  ReportController.getSingleReport,
);
router.get(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  ReportController.getAllReportByUserID,
);

export const ReportRoutes = router;
