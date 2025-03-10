import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { CustomerController } from './customer.controller';
import { CustomerValidation } from './customer.validation';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

//done

//done
router.patch(
  '/',
  auth(USER_ROLES.USER),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body?.data) {
      req.body = CustomerValidation.updateCustomerProfileZodSchema.parse(
        JSON.parse(req.body.data),
      );
    }
    
    return CustomerController.updateCustomerProfile(req, res, next);
  },
);

router.get(
  '/:id',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.ADMIN),
  CustomerController.getSingleCustomer,
);

router.get('/', auth(USER_ROLES.USER), CustomerController.getCustomerProfile);
export const CustomerRoutes = router;
