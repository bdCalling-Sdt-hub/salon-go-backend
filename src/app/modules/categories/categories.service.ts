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
  const result = await Category.find().populate({
    path: 'subSubCategories',
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
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const newSubCategory = await SubCategory.create([payload], { session });
    if (!newSubCategory?.length) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to create sub category',
      );
    }
    const category = await Category.findOneAndUpdate(
      { _id: payload.category },
      { $push: { subCategories: newSubCategory[0]._id } },
      { new: true },
    );
    await session.commitTransaction();
    await session.endSession();
    return newSubCategory[0];
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw error;
  }
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

const deleteSubCategoryToDB = async (id: string): Promise<ISubCategory> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await SubCategory.findOneAndDelete({ _id: id });
    if (!result) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to delete sub category',
      );
    }
    await Category.findOneAndUpdate(
      { _id: result?.category },
      { $pull: { subCategories: result?._id } },
      { new: true },
    );
    await session.commitTransaction();
    await session.endSession();
    return result;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw error;
  }
};

const createSubSubCategoryToDB = async (
  payload: ISubCategory,
): Promise<ISubSubCategory> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const newSubSubCategory = await SubSubCategory.create([payload], {
      session,
    });
    if (!newSubSubCategory?.length) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to create sub sub category',
      );
    }
    const subCategory = await SubCategory.findOneAndUpdate(
      { _id: payload.subSubCategories[0] },
      { $push: { subSubCategories: newSubSubCategory[0]._id } },
      { new: true },
    );
    await session.commitTransaction();
    await session.endSession();
    return newSubSubCategory[0];
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw error;
  }
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

const deleteSubSubCategoryToDB = async (
  id: string,
): Promise<ISubSubCategory> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await SubSubCategory.findOneAndDelete({ _id: id });
    if (!result) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to delete sub sub category',
      );
    }
    await SubCategory.findOneAndUpdate(
      { _id: result?.subCategory },
      { $pull: { subSubCategories: result?._id } },
      { new: true },
    );
    await session.commitTransaction();
    await session.endSession();
    return result;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw error;
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

    // Validate subCategory ObjectIds
    const isValidObjectIdArray = subCategories.every((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );
    if (!isValidObjectIdArray) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Invalid subCategory IDs provided',
      );
    }

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
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const areValidObjectIds = subCategories.every((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    if (!areValidObjectIds) {
      throw new Error('One or more subCategory IDs are invalid');
    }

    await Category.findOneAndUpdate(
      { _id: category },
      { $pull: { subCategories: { $in: subCategories } } }, // Use $in to remove multiple subCategories
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

// Add a subSubCategory to a subCategory (without duplicates)
const addSubSubCategoryToSubCategory = async (
  subCategory: Types.ObjectId,
  subSubCategories: Types.ObjectId[], // Expecting an array of subSubCategory IDs
) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Validate if all subSubCategory IDs are valid ObjectIds
    const areValidObjectIds = subSubCategories.every((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    if (!areValidObjectIds) {
      throw new Error('One or more subSubCategory IDs are invalid');
    }

    // Add multiple subSubCategories to the subCategory, ensuring no duplicates
    await SubCategory.findOneAndUpdate(
      { _id: subCategory },
      { $addToSet: { subSubCategories: { $each: subSubCategories } } }, // Use $addToSet with $each for multiple IDs
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

// Remove a subSubCategory from a subCategory
const removeSubSubCategoryFromSubCategory = async (
  subCategory: Types.ObjectId,
  subSubCategories: Types.ObjectId[], // Expecting an array of subSubCategory IDs
) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Validate if all subSubCategory IDs are valid ObjectIds
    const areValidObjectIds = subSubCategories.every((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    if (!areValidObjectIds) {
      throw new Error('One or more subSubCategory IDs are invalid');
    }

    // Remove multiple subSubCategories from the subCategory
    await SubCategory.findOneAndUpdate(
      { _id: subCategory },
      { $pull: { subSubCategories: { $in: subSubCategories } } }, // Use $in to remove multiple subSubCategories
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
