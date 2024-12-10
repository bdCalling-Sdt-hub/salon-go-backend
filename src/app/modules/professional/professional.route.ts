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
      req.body = ProfessionalValidation.partialProfessionalBusinessSchema.parse(
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
      req.body = JSON.parse(req.body.data);
    }

    return ProfessionalController.addToPortfolio(req, res, next);
  },
);

router.patch(
  '/update-portfolio',
  auth(USER_ROLES.PROFESSIONAL),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = ProfessionalValidation.updatePortfolioZodSchema.parse(
        JSON.parse(req.body.data),
      );
    }

    return ProfessionalController.updatePortfolioImage(req, res, next);
  },
);

router.patch(
  '/business-information',
  auth(USER_ROLES.PROFESSIONAL),
  validateRequest(ProfessionalValidation.partialProfessionalBusinessSchema),
  ProfessionalController.getBusinessInformationForProfessional,
);

//get single vendor by custom Id
router.get(
  '/profile',
  auth(USER_ROLES.PROFESSIONAL),
  ProfessionalController.getProfessionalProfile,
);

//delete professional
router.delete(
  '/delete',
  auth(USER_ROLES.PROFESSIONAL),
  ProfessionalController.deleteProfessionalProfile,
);

router.get(
  '/:id',
  auth(USER_ROLES.USER),
  ProfessionalController.getSingleProfessional,
);

//get all vendor for home page search and filter
router.get('/', ProfessionalController.getAllProfessional);

export const ProfessionalRoutes = router;
