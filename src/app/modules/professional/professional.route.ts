import express, { NextFunction, Request, Response } from 'express'
import auth from '../../middlewares/auth'
import { USER_ROLES } from '../../../enums/user'

import fileUploadHandler from '../../middlewares/fileUploadHandler'
import validateRequest from '../../middlewares/validateRequest'
import { ProfessionalValidation } from './professional.validation'
import { ProfessionalController } from './professional.controller'

const router = express.Router()

//update vendor
router.patch(
  '/',
  auth(USER_ROLES.PROFESSIONAL),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = ProfessionalValidation.updateProfessionalZodSchema.parse(
        JSON.parse(req.body.data)
      )
    }

    return ProfessionalController.updateProfessionalProfile(req, res, next)
  }
)
// router.patch('/bs', (req, res) => res.send('Route works!'));
router.patch(
  '/business-information',
  auth(USER_ROLES.PROFESSIONAL),
  validateRequest(
    ProfessionalValidation.getBusinessInformationFromProfessional
  ),
  ProfessionalController.getBusinessInformationForProfessional
)

//get single vendor by custom Id
router.get(
  '/profile',
  auth(USER_ROLES.PROFESSIONAL),
  ProfessionalController.getProfessionalProfile
)

//delete vendor Id
router.delete(
  '/delete',
  auth(USER_ROLES.PROFESSIONAL),
  ProfessionalController.deleteProfessionalProfile
)

//get all vendor for home page search and filter
router.get('/', ProfessionalController.getAllProfessional)

export const VendorRoutes = router
