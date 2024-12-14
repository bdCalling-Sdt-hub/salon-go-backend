import express, { NextFunction, Request, Response } from 'express';
import { CategoriesController } from './categories.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { CategoriesValidations } from './categories.validation';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/category',
  // auth(USER_ROLES.ADMIN),
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
  // auth(USER_ROLES.ADMIN),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
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
  // auth(USER_ROLES.ADMIN),
  CategoriesController.deleteCategory,
);

//sub category api's

router.post(
  '/sub-category',
  // auth(USER_ROLES.ADMIN),
  validateRequest(CategoriesValidations.createSubCategorySchema),
  CategoriesController.createSubCategory,
);

router.patch(
  '/sub-category/:id',
  // auth(USER_ROLES.ADMIN),
  validateRequest(CategoriesValidations.updateSubCategorySchema),
  CategoriesController.updateSubCategory,
);

router.delete(
  '/sub-category/:id',
  // auth(USER_ROLES.ADMIN),
  CategoriesController.deleteSubCategory,
);

//sub sub category api's

router.post(
  '/sub-sub-category',
  // auth(USER_ROLES.ADMIN),
  validateRequest(CategoriesValidations.createSubSubCategorySchema),
  CategoriesController.createSubSubCategory,
);

router.patch(
  '/sub-sub-category/:id',
  // auth(USER_ROLES.ADMIN),
  validateRequest(CategoriesValidations.updateSubSubCategorySchema),
  CategoriesController.updateSubSubCategory,
);

router.delete(
  '/sub-sub-category/:id',
  // auth(USER_ROLES.ADMIN),
  CategoriesController.deleteSubSubCategory,
);

router.get(
  '/category-list',
  CategoriesController.getCategoryForProfessionalUpdate,
);

//manage add and remove sub category and sub sub category
router.patch(
  '/add-sub-category-to-category/:id',
  // auth(USER_ROLES.ADMIN),
  validateRequest(CategoriesValidations.addSubCategoryToCategoryZodSchema),
  CategoriesController.addSubCategoryToCategory,
);

router.patch(
  '/remove-sub-category-from-category/:id',
  // auth(USER_ROLES.ADMIN),
  validateRequest(CategoriesValidations.removeSubCategoryFromCategoryZodSchema),
  CategoriesController.removeSubCategoryFromCategory,
);

router.patch(
  '/add-sub-sub-category-to-sub-category/:id',
  // auth(USER_ROLES.ADMIN),
  validateRequest(
    CategoriesValidations.addSubSubCategoryToSubCategoryZodSchema,
  ),
  CategoriesController.addSubSubCategoryToSubCategory,
);

router.patch(
  '/remove-sub-sub-category-from-sub-category/:id',
  // auth(USER_ROLES.ADMIN),
  validateRequest(
    CategoriesValidations.removeSubSubCategoryFromSubCategoryZodSchema,
  ),
  CategoriesController.removeSubSubCategoryFromSubCategory,
);

//filter categories
router.get('/', CategoriesController.filterCategories);

export const CategoriesRoutes = router;
