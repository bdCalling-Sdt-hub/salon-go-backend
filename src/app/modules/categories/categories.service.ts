import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import {
  ICategory,
  ISubCategory,
  ISubSubCategory,
} from './categories.interface';
import { Category, SubCategory, SubSubCategory } from './categories.model';
import mongoose, { Types } from 'mongoose';
import {
  deleteResourcesFromCloudinary,
  uploadToCloudinary,
} from '../../../utils/cloudinary';
import { JwtPayload } from 'jsonwebtoken';
import { IUser } from '../user/user.interface';
import { Professional } from '../professional/professional.model';

const getAllCategories = async () => {
  const result = await Category.find()
    .populate({
      path: 'subCategories',
      select: '_id name',
      populate: {
        path: 'subSubCategories',
        select: '_id name',
      },
    })
    .lean();

  //add type as category to all the categories
  const categoriesWithType = result.map((category) => ({
    ...category,
    type: 'category',
  }));

  return categoriesWithType;
};

interface ISubCategoryWithType extends ISubCategory {
  type: 'subCategory';
}

const getAllSubCategories = async () => {
  const result = await SubCategory.find()
    .populate({
      path: 'subSubCategories',
      select: '_id name',
    })
    .lean();

  return result.map((subCategory) => ({
    ...subCategory,
    type: 'subCategory',
  }));
};

const getAllSubSubCategories = async () => {
  const result = await SubSubCategory.find().lean();

  return result.map((subSubCategory) => ({
    ...subSubCategory,
    type: 'subSubCategory',
  }));
};
const createCategoryToDB = async (payload: ICategory): Promise<ICategory> => {
  console.log(payload);
  if (payload.image) {
    const uploadedImage = await uploadToCloudinary(
      payload.image,
      'categories',
      'image',
    );
    console.log(uploadedImage);
    if (!uploadedImage) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to upload image to Cloudinary',
      );
    }

    payload.image = uploadedImage[0];
  }

  const result = await Category.create(payload);
  if (!result) {
    if (payload.image) {
      await deleteResourcesFromCloudinary(payload.image, 'image', true);
    }
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create category');
  }
  return result;
};

const updateCategoryToDB = async (
  id: string,
  payload: Partial<ICategory>,
): Promise<ICategory> => {
  if (payload.image) {
    const uploadedImage = await uploadToCloudinary(
      payload.image,
      'categories',
      'image',
    );

    if (!uploadedImage) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to upload image to Cloudinary',
      );
    }

    payload.image = uploadedImage[0];
  }
  console.log(payload);
  const result = await Category.findOneAndUpdate(
    { _id: id },
    { $set: { ...payload } },
    {
      new: true,
    },
  );
  if (!result) {
    if (payload.image) {
      await deleteResourcesFromCloudinary(payload.image, 'image', true);
    }
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update category');
  }
  return result;
};

const deleteCategoryToDB = async (id: string): Promise<string> => {
  const result = await Category.findOneAndDelete({ _id: id });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete category');
  }

  await deleteResourcesFromCloudinary(result.image, 'image', true);

  return 'Category deleted successfully';
};

const createSubCategoryToDB = async (
  payload: ISubCategory,
): Promise<ISubCategory> => {
  if (payload.image) {
    const uploadedImage = await uploadToCloudinary(
      payload.image,
      'subCategories',
      'image',
    );

    if (!uploadedImage) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to upload image to Cloudinary',
      );
    }

    payload.image = uploadedImage[0];
  }

  const newSubCategory = await SubCategory.create([payload]);
  if (!newSubCategory?.length) {
    if (payload.image) {
      await deleteResourcesFromCloudinary(payload.image, 'image', true);
    }

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
  if (payload.image) {
    const uploadedImage = await uploadToCloudinary(
      payload.image,
      'subCategories',
      'image',
    );

    if (!uploadedImage) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to upload image to Cloudinary',
      );
    }

    payload.image = uploadedImage[0];
  }
  console.log(payload);
  const result = await SubCategory.findByIdAndUpdate(
    id,
    { ...payload },
    {
      new: true,
    },
  );
  if (!result) {
    if (payload.image) {
      const del = await deleteResourcesFromCloudinary(
        payload.image,
        'image',
        true,
      );
    }

    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update sub category',
    );
  }

  return result;
};

export const deleteSubCategoryToDB = async (id: string): Promise<string> => {
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
    await deleteResourcesFromCloudinary(subCategory.image, 'image', true);
    await session.commitTransaction();
    return 'Sub Category deleted successfully';
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
): Promise<ISubSubCategory> => {
  const result = await SubSubCategory.findOneAndUpdate({ _id: id }, payload, {
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

export const deleteSubSubCategoryToDB = async (id: string): Promise<string> => {
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
    return 'Sub Sub Category deleted successfully';
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Add multiple subCategories to a category (without duplicates)
const updateSubCategoriesInCategory = async (
  categoryId: Types.ObjectId,
  subCategories: Types.ObjectId[],
) => {
  const result = await Category.findOneAndUpdate(
    { _id: categoryId },
    { subCategories },
    { new: true },
  );

  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update subCategories in category',
    );
  }
  return result;
};
// Add a subSubCategory to a subCategory (without duplicates)
const updateSubSubCategoriesInSubCategory = async (
  subCategoryId: Types.ObjectId,
  subSubCategories: Types.ObjectId[],
) => {
  const result = await SubCategory.findOneAndUpdate(
    { _id: subCategoryId },
    { subSubCategories },
    { new: true },
  );

  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update subSubCategories in subCategory',
    );
  }
  return result;
};

const filterCategories = async () => {
  const result = await Category.find({})
    .populate({
      path: 'subCategories',
      select: { _id: 1, name: 1, image: 1 },
      populate: { path: 'subSubCategories', select: { _id: 1, name: 1 } },
    })
    .lean();
  return result;
};

const getCategoryForProfessionalUpdateFromDB = async (categoryId?: string) => {
  if (categoryId) {
    const result = await Category.findOne(
      { _id: categoryId },
      { name: 1, image: 1, _id: 1 },
    )
      .populate('subCategories', {
        name: 1,
        _id: 1,
      })
      .lean();
    if (!result) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get categories');
    }
    return result;
  }

  const result = await Category.find({}, { name: 1, image: 1, _id: 1 }).lean();

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get categories');
  }

  // Filter the categories for 'Men' and 'Woman'
  const filteredResult = result.filter(
    (item) => item.name === 'Men' || item.name === 'Woman',
  );

  // Sort the filtered result to ensure 'Men' comes first, then 'Woman'
  const sortedResult = filteredResult.sort((a, b) => {
    if (a.name === 'Men') return -1; // 'Men' should come first
    if (b.name === 'Men') return 1;
    return 0; // Keep 'Woman' in place if it's the only other option
  });

  return sortedResult;
};

const getSubCategoriesFromDB = async (
  user: JwtPayload,
  subCategoryId?: string,
  filter?: boolean,
) => {
  if (filter) {
    // When filter is true, we return only the subSubCategories related to the professional
    const isUserExist = await Professional.findById(user.userId).populate<{
      auth: IUser;
    }>('auth', { status: 1, role: 1 });

    if (!isUserExist) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'User does not exist');
    }

    const subCategoriesIds = isUserExist.subCategories;

    const subCategories = await SubCategory.find({
      _id: { $in: subCategoriesIds },
    }).populate('subSubCategories', { name: 1 });

    const allSubSubCategories = subCategories.flatMap(
      (subCategory) => subCategory.subSubCategories,
    );

    return allSubSubCategories;
  } else if (!subCategoryId) {
    const isUserExist = await Professional.findById(user.userId).populate<{
      auth: IUser;
    }>('auth', { status: 1, role: 1 });

    if (!isUserExist) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'User does not exist');
    }

    const categoryId = isUserExist.categories![0];
    const category = await Category.findById(categoryId).populate(
      'subCategories',
      { name: 1 },
    );

    if (!category) {
      return [];
    }
    return category.subCategories.filter((subCategory) =>
      isUserExist.subCategories!.includes(subCategory._id),
    );
  } else {
    const subCategory = await SubCategory.findById(subCategoryId).populate(
      'subSubCategories',
      {
        name: 1,
      },
    );

    if (!subCategory) {
      return [];
    }
    return subCategory.subSubCategories;
  }
};

const getSubSubCategoriesByProfessionalId = async (
  user: JwtPayload,
  id?: string,
) => {
  console.log(user)
  const professionalId = id ? id : user.userId;
  console.log(professionalId)
  const professional = await Professional.findById(professionalId).populate<{subCategories: {subSubCategories: Array<ISubSubCategory>}}>({
    path: 'subCategories',
    populate: {
      path: 'subSubCategories',
      select: { name: 1 },
    },
  });
  console.log(professional,"PPPPPPPPPP")
  if (!professional) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Professional not found');
  }

  const uniqueSubSubCategories = new Set();

  if (!professional.subCategories || !Array.isArray(professional.subCategories)) {
    return [];
  }

  professional.subCategories.forEach(subCategory => {
    if (subCategory.subSubCategories) {
      subCategory.subSubCategories.forEach((subSubCategory: ISubSubCategory) => {
        uniqueSubSubCategories.add(subSubCategory);
      });
    }
  });

  return Array.from(uniqueSubSubCategories);
};

export const CategoriesServices = {
  getAllCategories,
  getAllSubCategories,
  getAllSubSubCategories,
  createCategoryToDB,
  updateCategoryToDB,
  deleteCategoryToDB,
  createSubCategoryToDB,
  updateSubCategoryToDB,
  deleteSubCategoryToDB,
  createSubSubCategoryToDB,
  updateSubSubCategoryToDB,
  deleteSubSubCategoryToDB,
  getCategoryForProfessionalUpdateFromDB,
  //manage add and remove sub category and sub sub category

  updateSubCategoriesInCategory,
  updateSubSubCategoriesInSubCategory,
  getSubSubCategoriesByProfessionalId,
  //filter categories
  filterCategories,

  //get category for professional update
  getSubCategoriesFromDB,
};
