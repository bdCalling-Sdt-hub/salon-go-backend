import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { ReviewValidations } from './review.validation';
import { ReviewController } from './review.controller';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.USER),
  validateRequest(ReviewValidations.createReviewZodSchema),
  ReviewController.createReview,
);

router.get('/:id', ReviewController.getReviewsByProfessionalId);

router.delete('/:id', ReviewController.deleteReview);

export const ReviewRoutes = router;
