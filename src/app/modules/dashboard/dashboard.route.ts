import express from 'express';
import { DashboardController } from './dashboard.controller';

const router = express.Router();

router.get('/time-slots', DashboardController.getTimeSchedule);

export const DashboardRoutes = router;
