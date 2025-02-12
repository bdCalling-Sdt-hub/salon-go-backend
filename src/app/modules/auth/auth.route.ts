import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';
// import { rateLimiter } from '../../../utils/rateLimmiter';

const router = express.Router();

router.post(
  '/login',
  // rateLimiter,
  validateRequest(AuthValidation.createLoginZodSchema),
  AuthController.loginUser,
);

router.post('/refresh-token', AuthController.refreshToken);

router.post(
  '/forget-password',
  validateRequest(AuthValidation.createForgetPasswordZodSchema),
  AuthController.forgetPassword,
);

router.post(
  '/verify-email-phone',
  validateRequest(AuthValidation.createVerifyEmailOrPhoneZodSchema),
  AuthController.verifyEmailOrPhone,
);
router.post(
  '/verify-phone',
  validateRequest(AuthValidation.createVerifyPhoneZodSchema),
  AuthController.verifyPhone,
);

router.post(
  '/reset-password',
  validateRequest(AuthValidation.createResetPasswordZodSchema),
  AuthController.resetPassword,
);

router.post(
  '/change-password',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.PROFESSIONAL),
  validateRequest(AuthValidation.createChangePasswordZodSchema),
  AuthController.changePassword,
);

router.post(
  '/delete-account',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.PROFESSIONAL),
  validateRequest(AuthValidation.deleteAccountZodSchema),
  AuthController.deleteAccount,
);


router.post(
  '/social-login',
  validateRequest(AuthValidation.createSocialLoginZodSchema),
  AuthController.socialLogin,
);



export const AuthRoutes = router;
