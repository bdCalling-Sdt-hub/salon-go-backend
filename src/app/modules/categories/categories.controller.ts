import { Request, Response, NextFunction } from 'express';
import { CategoriesServices } from './categories.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoriesServices.getAllCategories();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All categories retrieved successfully',
    data: result,
  });
});

const getAllSubCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoriesServices.getAllSubCategories();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All sub categories retrieved successfully',
    data: result,
  });
});

const getAllSubSubCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CategoriesServices.getAllSubSubCategories();
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'All sub sub categories retrieved successfully',
      data: result,
    });
  },
);

const createCategory = catchAsync(async (req: Request, res: Response) => {
  let categoryImage;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    categoryImage = `/images/${req.files.image[0].filename}`;
  }

  const data = {
    image: categoryImage,
    ...req.body,
  };
  const result = await CategoriesServices.createCategoryToDB(data);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category created successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ...categoryData } = req.body;
  let categoryImage;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    categoryImage = `/images/${req.files.image[0].filename}`;
    categoryData.image = categoryImage;
  }
  const result = await CategoriesServices.updateCategoryToDB(id, categoryData);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category updated successfully',
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoriesServices.deleteCategoryToDB(id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category deleted successfully',
    data: result,
  });
});

const createSubCategory = catchAsync(async (req: Request, res: Response) => {
  const { ...subCategoryData } = req.body;
  const result = await CategoriesServices.createSubCategoryToDB(
    subCategoryData,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'SubCategory created successfully',
    data: result,
  });
});

const updateSubCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ...subCategoryData } = req.body;
  console.log(subCategoryData);
  const result = await CategoriesServices.updateSubCategoryToDB(
    id,
    subCategoryData,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'SubCategory updated successfully',
    data: result,
  });
});

const deleteSubCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoriesServices.deleteSubCategoryToDB(id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'SubCategory deleted successfully',
    data: result,
  });
});

const createSubSubCategory = catchAsync(async (req: Request, res: Response) => {
  const { ...subSubCategoryData } = req.body;
  const result = await CategoriesServices.createSubSubCategoryToDB(
    subSubCategoryData,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'SubSubCategory created successfully',
    data: result,
  });
});

const updateSubSubCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ...subCategoryData } = req.body;
  console.log(subCategoryData);
  const result = await CategoriesServices.updateSubSubCategoryToDB(
    id,
    subCategoryData,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'SubCategory updated successfully',
    data: result,
  });
});

const deleteSubSubCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoriesServices.deleteSubSubCategoryToDB(id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'SubCategory deleted successfully',
    data: result,
  });
});

const getCategoryForProfessionalUpdate = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.query;
    const result =
      await CategoriesServices.getCategoryForProfessionalUpdateFromDB(
        id as string,
      );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'All categories retrieved successfully',
      data: result,
    });
  },
);

//------------------------------------------------------

//manage add and remove sub category and sub sub category
const addSubCategoryToCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const { subCategories } = req.body;

    const result = await CategoriesServices.addSubCategoryToCategory(
      new Types.ObjectId(id),
      subCategories,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'SubCategory added successfully',
      data: result,
    });
  },
);

const removeSubCategoryFromCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { subCategories } = req.body;
    const result = await CategoriesServices.removeSubCategoryFromCategory(
      new Types.ObjectId(id),
      subCategories,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'SubCategory removed successfully',
      data: result,
    });
  },
);

const addSubSubCategoryToSubCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { subSubCategories } = req.body;
    const result = await CategoriesServices.addSubSubCategoryToSubCategory(
      new Types.ObjectId(id),
      subSubCategories,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'SubSubCategory added successfully',
      data: result,
    });
  },
);

const removeSubSubCategoryFromSubCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { subSubCategories } = req.body;
    const result = await CategoriesServices.removeSubSubCategoryFromSubCategory(
      new Types.ObjectId(id),
      subSubCategories,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'SubSubCategory removed successfully',
      data: result,
    });
  },
);

const filterCategories = catchAsync(async (req: Request, res: Response) => {
  const { categoryId, subCategoryId } = req.query;
  const result = await CategoriesServices.filterCategories(
    categoryId as string,
    subCategoryId as string,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All categories retrieved successfully',
    data: result,
  });
});

export const CategoriesController = {
  getAllCategories,
  getAllSubCategories,
  getAllSubSubCategories,
  createCategory,
  createSubCategory,
  createSubSubCategory,
  updateCategory,
  updateSubCategory,
  updateSubSubCategory,
  deleteCategory,
  deleteSubCategory,
  deleteSubSubCategory,
  getCategoryForProfessionalUpdate,
  //manage add and remove sub category and sub sub category
  addSubCategoryToCategory,
  removeSubCategoryFromCategory,
  addSubSubCategoryToSubCategory,
  removeSubSubCategoryFromSubCategory,

  //filter categories
  filterCategories,
};
