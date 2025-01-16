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

const getAllCategories = async (): Promise<ICategory[]> => {
  const result = await Category.find()
    .populate({
      path: 'subCategories',
      select: '_id name',
      populate: {
        path: 'subSubCategories',
        select: '_id name',
      },
    })
    .exec();

  return result;
};

const getAllSubCategories = async (): Promise<ISubCategory[]> => {
  const result = await SubCategory.find()
    .populate({ path: 'subSubCategories', select: '_id name' })
    .exec();
  return result;
};

const getAllSubSubCategories = async (): Promise<ISubSubCategory[]> => {
  const result = await SubSubCategory.find().exec();
  return result;
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

// export const filterCategories = async (
//   categoryId?: string,
//   subCategoryId?: string,
// ) => {
//   try {
//     const pipeline: any[] = [];
//     pipeline.push({
//       $project: {
//         name: 1,
//         image: 1,
//         subCategories: 1,
//       },
//     });

//     const categories = await Category.aggregate(pipeline);

//     let subCategories: any[] = [];
//     let subSubCategories: any[] = [];

//     if (categoryId) {
//       const selectedCategory = categories.find(
//         (category) => category._id.toString() === categoryId,
//       );

//       if (selectedCategory && selectedCategory.subCategories.length > 0) {
//         subCategories = await SubCategory.find(
//           { _id: { $in: selectedCategory.subCategories } },
//           { name: 1, subSubCategories: 1 },
//         ).lean();

//         if (subCategoryId) {
//           const selectedSubCategory = subCategories.find(
//             (subCategory) => subCategory._id.toString() === subCategoryId,
//           );

//           if (
//             selectedSubCategory &&
//             selectedSubCategory.subSubCategories.length > 0
//           ) {
//             subSubCategories = await SubSubCategory.find(
//               { _id: { $in: selectedSubCategory.subSubCategories } },
//               { name: 1 },
//             ).lean();
//           }
//         } else {
//           const firstSubCategory = subCategories[0];
//           if (
//             firstSubCategory &&
//             firstSubCategory.subSubCategories.length > 0
//           ) {
//             subSubCategories = await SubSubCategory.find(
//               { _id: { $in: firstSubCategory.subSubCategories } },
//               { name: 1 },
//             ).lean();
//           }
//         }
//       }
//     } else {
//       subCategories = await SubCategory.find({}, { name: 1 }).lean();
//     }
//     const data = {
//       categories,
//       subCategories,
//       subSubCategories,
//     };
//     return data;
//   } catch (error) {
//     console.error(error);
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Error fetching categories');
//   }
// };

const filterCategories = async (
  categoryId?: string,
  subCategoryId?: string,
) => {
  try {
    let categories: any[] = [];
    let subCategories: any[] = [];
    let subSubCategories: any[] = [];

    // Fetch all categories without populating subCategories
    categories = await Category.find({}, { name: 1, image: 1 }).lean();

    if (categoryId) {
      // Find and filter subCategories when categoryId is provided
      const category = await Category.findById(categoryId, {
        subCategories: 1,
      }).lean();
      const subCategoryIds = category?.subCategories || [];

      if (subCategoryIds.length > 0) {
        subCategories = await SubCategory.find(
          { _id: { $in: subCategoryIds } },
          { _id: 1, name: 1, image: 1 },
        ).lean();

        if (subCategoryId) {
          const subCategory = await SubCategory.findById(subCategoryId, {
            subSubCategories: 1,
          }).lean();
          const subSubCategoryIds = subCategory?.subSubCategories || [];

          if (subSubCategoryIds.length > 0) {
            subSubCategories = await SubSubCategory.find(
              { _id: { $in: subSubCategoryIds } },
              { _id: 1, name: 1 },
            ).lean();
          }
        } else {
          const firstSubCategory = subCategories[0];
          if (firstSubCategory) {
            const subSubCategoryIds = await SubCategory.findById(
              firstSubCategory._id,
              { subSubCategories: 1 },
            ).lean();
            if ((subSubCategoryIds?.subSubCategories ?? []).length > 0) {
              subSubCategories = await SubSubCategory.find(
                { _id: { $in: subSubCategoryIds?.subSubCategories ?? [] } },
                { _id: 1, name: 1 },
              ).lean();
            }
          }
        }
      }
    } else {
      // No categoryId provided, fetch all subCategories and subSubCategories separately
      subCategories = await SubCategory.find(
        {},
        { _id: 1, name: 1, image: 1 },
      ).lean();
      const allSubSubCategoryIds = await SubCategory.find(
        {},
        { subSubCategories: 1 },
      )
        .lean()
        .then((result) =>
          result.flatMap((subCategory) => subCategory.subSubCategories),
        );
      if (allSubSubCategoryIds.length > 0) {
        subSubCategories = await SubSubCategory.find(
          { _id: { $in: allSubSubCategoryIds } },
          { _id: 1, name: 1 },
        ).lean();
      }
    }

    return {
      categories: [...categories, ...subCategories],
      subSubCategories,
    };
  } catch (error) {
    console.error(error);
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Error fetching categories');
  }
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
  addSubCategoryToCategory,
  removeSubCategoryFromCategory,
  addSubSubCategoryToSubCategory,
  removeSubSubCategoryFromSubCategory,

  //filter categories
  filterCategories,

  //get category for professional update
  getSubCategoriesFromDB,
};
