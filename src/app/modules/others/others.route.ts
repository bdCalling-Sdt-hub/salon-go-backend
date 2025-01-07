import express, { NextFunction, Request, Response } from 'express';
import { OthersController } from './others.controller';
import validateRequest from '../../middlewares/validateRequest';
import { othersValidation } from './others.validation';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

router.post(
  '/add-banner',
  auth(USER_ROLES.ADMIN),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = othersValidation.createBannerSchema.parse(
        JSON.parse(req.body.data),
      );
    }

    return OthersController.addBanner(req, res, next);
  },
);
router.get(
  '/banner',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  OthersController.getBanners,
);
router.get(
  '/banner/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  OthersController.getSingleBanner,
);
router.patch(
  '/update-banner/:id',
  auth(USER_ROLES.ADMIN),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = othersValidation.updateBannerSchema.parse(
        JSON.parse(req.body.data),
      );
    }
    return OthersController.updateBanner(req, res, next);
  },
);
router.post(
  '/privacy-policy',
  auth(USER_ROLES.ADMIN),
  validateRequest(othersValidation.createPrivacyPolicyZodSchema),
  OthersController.createPrivacyPolicy,
);
router.post(
  '/terms-and-condition',
  auth(USER_ROLES.ADMIN),
  validateRequest(othersValidation.createTermsAndConditionsZodSchema),
  OthersController.createTermsAndConditions,
);
router.post(
  '/faq',
  auth(USER_ROLES.ADMIN),
  validateRequest(othersValidation.createFaqsZodSchema),
  OthersController.createFaQs,
);

router.delete(
  '/banner/:id',
  auth(USER_ROLES.ADMIN),
  OthersController.deleteBanner,
);

router.delete(
  '/privacy-policy/:id',
  auth(USER_ROLES.ADMIN),
  OthersController.deletePrivacyPolicy,
);
router.delete(
  '/terms-and-conditions/:id',
  auth(USER_ROLES.ADMIN),
  OthersController.deleteTermsAndConditions,
);
router.delete('/faq/:id', auth(USER_ROLES.ADMIN), OthersController.deleteFaQs);

router.get(
  '/privacy-policy/:type',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  OthersController.getPrivacyPolicy,
);
router.get(
  '/terms-and-conditions/:type',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  OthersController.getTermsAndConditions,
);
router.get(
  '/faq/:type',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  OthersController.getFaQs,
);

export const OthersRoutes = router;
