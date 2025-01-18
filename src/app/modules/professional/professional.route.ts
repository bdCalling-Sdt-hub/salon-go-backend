import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

import fileUploadHandler from '../../middlewares/fileUploadHandler';
import validateRequest from '../../middlewares/validateRequest';
import { ProfessionalValidation } from './professional.validation';
import { ProfessionalController } from './professional.controller';

const router = express.Router();

//update professionals profile
router.patch(
  '/',
  auth(USER_ROLES.PROFESSIONAL),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body =
        ProfessionalValidation.updateProfessionalProfileZodSchema.parse(
          JSON.parse(req.body.data),
        );
    }

    return ProfessionalController.updateProfessionalProfile(req, res, next);
  },
);

router.patch(
  '/portfolio',
  auth(USER_ROLES.PROFESSIONAL),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = ProfessionalValidation.updatePortfolioZodSchema.parse(
        JSON.parse(req.body.data),
      );
    }

    return ProfessionalController.managePortfolio(req, res, next);
  },
);

router.get(
  '/portfolio/:id',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  ProfessionalController.getProfessionalPortfolio,
);

router.patch(
  '/business-information',
  auth(USER_ROLES.PROFESSIONAL),
  validateRequest(ProfessionalValidation.partialProfessionalBusinessSchema),
  ProfessionalController.getBusinessInformationForProfessional,
);

router.get(
  '/profile',
  auth(USER_ROLES.PROFESSIONAL),
  ProfessionalController.getProfessionalProfile,
);

router.get(
  '/revenue',

  auth(USER_ROLES.PROFESSIONAL),
  ProfessionalController.getProfessionalRevenue,
);

router.get(
  '/reservation-rate',
  auth(USER_ROLES.PROFESSIONAL),
  ProfessionalController.getProfessionalReservationRate,
);

router.get(
  '/engagement-rate',
  auth(USER_ROLES.PROFESSIONAL),
  ProfessionalController.getProfessionalEngagementRate,
);

router.get(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ProfessionalController.getSingleProfessional,
);

//get all professionals profile with filter and pagination
router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL),
  ProfessionalController.getAllProfessional,
);

export const ProfessionalRoutes = router;
