import express from 'express';
import { ServiceController } from './service.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { ServiceValidations } from './service.validation';

const router = express.Router();
router.post(
  '/',
  auth(USER_ROLES.PROFESSIONAL),
  validateRequest(ServiceValidations.createServiceZodSchema),
  ServiceController.createService,
);

router.patch(
  '/:id',
  auth(USER_ROLES.PROFESSIONAL),
  validateRequest(ServiceValidations.updateServiceZodSchema),
  ServiceController.updateService,
);

router.delete(
  '/:id',
  auth(USER_ROLES.PROFESSIONAL),
  ServiceController.deleteService,
);

//need to implement category based filter in this
router.get(
  '/',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  ServiceController.getServicesByProfessionalId,
);

export const ServiceRoutes = router;
