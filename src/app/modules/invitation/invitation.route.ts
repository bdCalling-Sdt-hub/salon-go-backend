import express from 'express';
import { InvitationController } from './invitation.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { InvitationValidations } from './invitation.validation';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.PROFESSIONAL),
  validateRequest(InvitationValidations.sendInvitationZodSchema),
  InvitationController.sendInvitation,
);

export const InvitationRoutes = router;
