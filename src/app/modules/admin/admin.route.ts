import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { AdminController } from './admin.controller';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { AdminValidation } from './admin.validation';

const router = express.Router();

router.get('/profile', auth(USER_ROLES.ADMIN), AdminController.getAdminProfile);
router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {

    if (req.body?.data) {
      req.body = AdminValidation.updateAdminZodSchema.parse(
        JSON.parse(req.body.data),
      );
    }
    return AdminController.updateAdminProfile(req, res, next);
  },
);

router.patch(
  '/recommend/:id',
  auth(USER_ROLES.ADMIN),
  AdminController.recommendProfessional,
);

export const AdminRoutes = router;
