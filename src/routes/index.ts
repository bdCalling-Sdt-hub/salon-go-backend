import { ProfessionalRoutes } from './../app/modules/professional/professional.route';
import express from 'express';
import { UserRoutes } from '../app/modules/user/user.route';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { CustomerRoutes } from '../app/modules/customer/customer.route';
import { CategoriesRoutes } from '../app/modules/categories/categories.route';

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
];

apiRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
