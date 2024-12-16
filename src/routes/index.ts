import { ProfessionalRoutes } from './../app/modules/professional/professional.route';
import express from 'express';
import { UserRoutes } from '../app/modules/user/user.route';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { CustomerRoutes } from '../app/modules/customer/customer.route';
import { CategoriesRoutes } from '../app/modules/categories/categories.route';
import { ChatRoutes } from '../app/modules/chat/chat.route';
import { MessageRoutes } from '../app/modules/message/message.route';
import { BookMarkRoutes } from '../app/modules/bookmark/bookmark.route';
import { ScheduleRoutes } from '../app/modules/schedule/schedule.route';
import { ServiceRoutes } from '../app/modules/service/service.route';
import { ReviewRoutes } from '../app/modules/review/review.route';
import { ReservationRoutes } from '../app/modules/reservation/reservation.route';
import { ReportRoutes } from '../app/modules/report/report.route';
import { DashboardRoutes } from '../app/modules/dashboard/dashboard.route';

const router = express.Router();

export const apiRoutes: { path: string; route: any }[] = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/user',
    route: UserRoutes,
  },
  {
    path: '/customer',
    route: CustomerRoutes,
  },
  { path: '/professional', route: ProfessionalRoutes },
  {
    path: '/categories',
    route: CategoriesRoutes,
  },
  {
    path: '/chat',
    route: ChatRoutes,
  },
  {
    path: '/message',
    route: MessageRoutes,
  },
  {
    path: '/bookmark',
    route: BookMarkRoutes,
  },
  {
    path: '/schedule',
    route: ScheduleRoutes,
  },
  {
    path: '/service',
    route: ServiceRoutes,
  },
  {
    path: '/review',
    route: ReviewRoutes,
  },
  {
    path: '/reservation',
    route: ReservationRoutes,
  },
  {
    path: '/report',
    route: ReportRoutes,
  },
  {
    path: '/dashboard',
    route: DashboardRoutes,
  },
];

apiRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
