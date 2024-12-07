import express from 'express';
import { ServiceController } from './service.controller';

const router = express.Router();

router.get('/', ServiceController); 

export const ServiceRoutes = router;
