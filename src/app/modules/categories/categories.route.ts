import express, { NextFunction, Request, Response } from 'express';
import { CategoriesController } from './categories.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { CategoriesValidations } from './categories.validation';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.get(
  '/sub-categories',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER, USER_ROLES.ADMIN),
  CategoriesController.getSubCategories,
);
router.get(
  '/admin/sub-categories',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER, USER_ROLES.ADMIN),
  CategoriesController.getAllSubCategories,
);
router.post(
  '/category',
  auth(USER_ROLES.ADMIN),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = CategoriesValidations.createCategorySchema.parse(
        JSON.parse(req.body.data),
      );
    }

    return CategoriesController.createCategory(req, res, next);
  },
);

router.patch(
  '/category/:id',
  auth(USER_ROLES.ADMIN),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body, 'body', req.files);
    if (req.body.data) {
      req.body = CategoriesValidations.updateCategorySchema.parse(
        JSON.parse(req.body.data),
      );
    }

    return CategoriesController.updateCategory(req, res, next);
  },
);

router.delete(
  '/category/:id',
  auth(USER_ROLES.ADMIN),
  CategoriesController.deleteCategory,
);

//sub category api's

router.post(
  '/sub-category',
  auth(USER_ROLES.ADMIN),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = CategoriesValidations.createSubCategorySchema.parse(
        JSON.parse(req.body.data),
      );
    }

    return CategoriesController.createSubCategory(req, res, next);
  },
);

router.patch(
  '/sub-category/:id',
  auth(USER_ROLES.ADMIN),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = CategoriesValidations.updateSubCategorySchema.parse(
        JSON.parse(req.body.data),
      );
    }

    return CategoriesController.updateSubCategory(req, res, next);
  },
);

router.delete(
  '/sub-category/:id',
  auth(USER_ROLES.ADMIN),
  CategoriesController.deleteSubCategory,
);

//sub sub category api's

router.post(
  '/sub-sub-category',
  auth(USER_ROLES.ADMIN),
  validateRequest(CategoriesValidations.createSubSubCategorySchema),
  CategoriesController.createSubSubCategory,
);

router.patch(
  '/sub-sub-category/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(CategoriesValidations.updateSubSubCategorySchema),
  CategoriesController.updateSubSubCategory,
);

router.delete(
  '/sub-sub-category/:id',
  auth(USER_ROLES.ADMIN),
  CategoriesController.deleteSubSubCategory,
);

router.get(
  '/category-list',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  CategoriesController.getCategoryForProfessionalUpdate,
);

//manage add and remove sub category and sub sub category

router.patch(
  '/add-remove-sub-category-from-category/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(
    CategoriesValidations.addOrRemoveSubCategoryToCategoryZodSchema,
  ),
  CategoriesController.updateSubCategoriesInCategory,
);

router.patch(
  '/add-remove-sub-sub-category-to-sub-category/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(
    CategoriesValidations.addOrRemoveSubSubCategoryToSubCategoryZodSchema,
  ),
  CategoriesController.updateSubSubCategoriesInSubCategory,
);

router.get(
  '/all',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  CategoriesController.getAllCategories,
);

router.get(
  '/sub-categories',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  CategoriesController.getAllSubCategories,
);

router.get(
  '/sub-sub-categories',
  auth(USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.USER),
  CategoriesController.getAllSubSubCategories,
);
//filter categories
router.get(
  '/',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER, USER_ROLES.ADMIN),
  CategoriesController.filterCategories,
);

// router.get(
//   '/sub-sub-categories-by-professional/',
//   auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER, USER_ROLES.ADMIN),
//   CategoriesController.getSubSubCategoriesByProfessionalId,
// );

router.get(
  '/categories-and-sub-categories/',
  auth(USER_ROLES.PROFESSIONAL, USER_ROLES.USER, USER_ROLES.ADMIN),
  CategoriesController.getSubCategoriesAndSubSubCategoriesForFiltering,
);

export const CategoriesRoutes = router;
