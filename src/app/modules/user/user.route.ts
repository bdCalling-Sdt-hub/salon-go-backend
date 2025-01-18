import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
const router = express.Router();

//get user profile
router.get(
  '/profile',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  UserController.getUserProfile,
);

//create user
router.post(
  '/create-account',
  validateRequest(UserValidation.createUserZodSchema),
  UserController.createUser,
);

//restrict or unrestrict user
router.patch(
  '/restrict/:id',
  auth(USER_ROLES.ADMIN),
  UserController.restrictOrUnrestrictUser,
);

//approve user
router.patch(
  '/approve/:id',
  auth(USER_ROLES.ADMIN),
  UserController.approveUser,
);

//get all user
router.get('/', auth(USER_ROLES.ADMIN), UserController.getAllUser);

export const UserRoutes = router;
