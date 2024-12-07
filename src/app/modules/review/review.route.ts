import express from 'express';
import { ReviewController } from './review.controller';

const router = express.Router();

router.get('/', ReviewController); 

export const ReviewRoutes = router;
