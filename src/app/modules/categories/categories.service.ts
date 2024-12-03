import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import {
  ICategory,
  ISubCategory,
  ISubSubCategory,
} from './categories.interface';
import { Category, SubCategory, SubSubCategory } from './categories.model';
import mongoose, { Types } from 'mongoose';

const getAllCategories = async (): Promise<ICategory[]> => {
  const result = await Category.find()
    .populate('subCategories')
    .populate({
      path: 'subCategories',
      populate: { path: 'subSubCategories' },
    });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get categories');
  }
  return result;
};

const createCategoryToDB = async (payload: ICategory): Promise<ICategory> => {
  const result = await Category.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create category');
  }
  return result;
};

const updateCategoryToDB = async (
  id: string,
  payload: Partial<ICategory>,
): Promise<ICategory> => {
  const result = await Category.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update category');
  }
  return result;
};

const deleteCategoryToDB = async (id: string): Promise<ICategory> => {
  const result = await Category.findOneAndDelete({ _id: id });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete category');
  }
  return result;
};

const createSubCategoryToDB = async (
  payload: ISubCategory,
): Promise<ISubCategory> => {
  const newSubCategory = await SubCategory.create([payload]);
  if (!newSubCategory?.length) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create sub category',
    );
  }
  return newSubCategory[0];
};

const updateSubCategoryToDB = async (
  id: string,
  payload: Partial<ISubCategory>,
): Promise<ISubCategory> => {
  const result = await SubCategory.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update sub category',
    );
  }
  return result;
};

export const deleteSubCategoryToDB = async (
  id: string,
): Promise<ISubCategory | null> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid subCategory ID');
    }

    const category = await Category.findOneAndUpdate(
      { subCategories: id },
      { $pull: { subCategories: id } },
      { new: true, session },
    );

    const subCategory = await SubCategory.findOneAndDelete(
      { _id: id },
      { session },
    );

    if (!subCategory) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to delete subCategory',
      );
    }

    await session.commitTransaction();
    return subCategory;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const createSubSubCategoryToDB = async (
  payload: ISubCategory,
): Promise<ISubSubCategory> => {
  const newSubSubCategory = await SubSubCategory.create([payload]);
  if (!newSubSubCategory?.length) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create sub sub category',
    );
  }
  return newSubSubCategory[0];
};

const updateSubSubCategoryToDB = async (
  id: string,
  payload: Partial<ISubSubCategory>,
): Promise<ISubCategory> => {
  const result = await SubCategory.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update sub sub category',
    );
  }
  return result;
};

export const deleteSubSubCategoryToDB = async (
  id: string,
): Promise<ISubSubCategory | null> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid subCategory ID');
    }

    const subCategory = await SubCategory.findOneAndUpdate(
      { subSubCategories: id },
      { $pull: { subSubCategories: id } },
      { new: true, session },
    );

    if (!subCategory) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'SubCategory not associated with any Category',
      );
    }

    const subSubCategory = await SubSubCategory.findOneAndDelete(
      { _id: id },
      { session },
    );

    if (!subSubCategory) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to delete subCategory',
      );
    }

    await session.commitTransaction();
    return subCategory;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Add multiple subCategories to a category (without duplicates)
const addSubCategoryToCategory = async (
  category: Types.ObjectId,
  subCategories: Types.ObjectId[],
) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Add subcategories to the category, ensuring no duplicates
    await Category.findOneAndUpdate(
      { _id: category },
      { $addToSet: { subCategories: { $each: subCategories } } }, // Use $addToSet to prevent duplicates
      { new: true, session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Remove a subCategory from a category
const removeSubCategoryFromCategory = async (
  category: Types.ObjectId,
  subCategories: Types.ObjectId[],
) => {
  const result = await Category.findOneAndUpdate(
    { _id: category },
    { $pull: { subCategories: { $in: subCategories } } }, // Use $in to remove multiple subCategories
    { new: true },
  );

  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to remove subCategory from category',
    );
  }

  return result;
};

// Add a subSubCategory to a subCategory (without duplicates)
const addSubSubCategoryToSubCategory = async (
  subCategory: Types.ObjectId,
  subSubCategories: Types.ObjectId[], // Expecting an array of subSubCategory IDs
) => {
  // Add multiple subSubCategories to the subCategory, ensuring no duplicates
  const result = await SubCategory.findOneAndUpdate(
    { _id: subCategory },
    { $addToSet: { subSubCategories: { $each: subSubCategories } } }, // Use $addToSet with $each for multiple IDs
    { new: true },
  );

  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to add subSubCategory to subCategory',
    );
  }

  return result;
};

// Remove a subSubCategory from a subCategory
const removeSubSubCategoryFromSubCategory = async (
  subCategory: Types.ObjectId,
  subSubCategories: Types.ObjectId[],
) => {
  const result = await SubCategory.findOneAndUpdate(
    { _id: subCategory },
    { $pull: { subSubCategories: { $in: subSubCategories } } },
    { new: true },
  );

  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to remove subSubCategory from subCategory',
    );
  }

  return result;
};
export const CategoriesServices = {
  getAllCategories,
  createCategoryToDB,
  updateCategoryToDB,
  deleteCategoryToDB,
  createSubCategoryToDB,
  updateSubCategoryToDB,
  deleteSubCategoryToDB,
  createSubSubCategoryToDB,
  updateSubSubCategoryToDB,
  deleteSubSubCategoryToDB,
  //manage add and remove sub category and sub sub category
  addSubCategoryToCategory,
  removeSubCategoryFromCategory,
  addSubSubCategoryToSubCategory,
  removeSubSubCategoryFromSubCategory,
};
