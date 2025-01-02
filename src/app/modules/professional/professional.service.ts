import { JwtPayload } from 'jsonwebtoken';
import { parse } from 'date-fns';
import { IPaginationOptions } from '../../../types/pagination';

import { IProfessional, IProfessionalFilters } from './professional.interface';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Professional } from './professional.model';
import { Service } from '../service/service.model';
import getNextOnboardingStep, {
  handleObjectUpdate,
} from './professional.utils';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { QueryHelper } from '../../../utils/queryHelper';
import { Schedule } from '../schedule/schedule.model';
import { User } from '../user/user.model';
import { IUser } from '../user/user.interface';
import {
  deleteResourcesFromCloudinary,
  uploadToCloudinary,
} from '../../../utils/cloudinary';

const updateProfessionalProfile = async (
  user: JwtPayload,
  payload: Partial<IProfessional & IUser>,
) => {
  const { name, profile, socialLinks, ...restData } = payload;

  const userExist = await Professional.findById({ _id: user.userId }).populate<{
    auth: IUser;
  }>({ path: 'auth', select: { profile: 1 } });
  if (!userExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Professional not found!');
  }

  const session = await Professional.startSession();
  session.startTransaction();

  try {
    // 🖼️ Handle image upload if profile exists
    let uploadedImageUrl: string | null = null;
    if (profile) {
      const { path } = profile as any;
      const uploadedImage = await uploadToCloudinary(
        path,
        'professional',
        'image',
      );

      if (!uploadedImage || uploadedImage.length === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to upload image.');
      }
      uploadedImageUrl = uploadedImage[0];
    }
    // 📝 Update User Profile

    if (name || uploadedImageUrl) {
      const userUpdateResult = await User.findByIdAndUpdate(
        { _id: user.id },
        {
          $set: {
            ...(name && { name: name }),
            ...(uploadedImageUrl && { profile: uploadedImageUrl }),
          },
        },
        { new: true, session },
      );
      console.log(userUpdateResult, 'userUpdate');
      // Rollback uploaded image if User update fails
      if (userUpdateResult?.profile !== uploadedImageUrl || !userUpdateResult) {
        if (uploadedImageUrl) {
          console.log(
            uploadedImageUrl,
            userUpdateResult?.profile,
            !userUpdateResult,
          );
          await deleteResourcesFromCloudinary(uploadedImageUrl, 'image', true);
        }
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to update user profile.',
        );
      }
      //remove old image from cloudinary
      const { profile: oldProfile } = userExist.auth;
      console.log(oldProfile, 'oldProfile', uploadedImageUrl);
      if (oldProfile && uploadedImageUrl) {
        console.log(oldProfile, uploadedImageUrl);
        await deleteResourcesFromCloudinary(oldProfile, 'image', true);
      }
    }

    // 📝 Update Professional Profile
    let updatedData = { ...restData };
    if (socialLinks && Object.keys(socialLinks).length > 0) {
      updatedData = handleObjectUpdate(socialLinks, updatedData, 'socialLinks');
    }

    // Update the `Professional` profile
    const result = await Professional.findByIdAndUpdate(
      { _id: user.userId },
      { $set: { ...updatedData } },
      { new: true, session },
    );

    if (!result) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update profile!');
    }

    // ✅ Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    return result as IProfessional;
  } catch (error) {
    // ❌ Rollback the transaction on failure
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getBusinessInformationForProfessional = async (
  user: JwtPayload,
  payload: Partial<IProfessional>,
) => {
  console.log(payload);

  const existingProfessional = await Professional.findById({
    _id: user.userId,
  }).populate<{ auth: IUser }>('auth', { status: 1 });

  if (!existingProfessional) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Professional not found!');
  }

  const result = await Professional.findByIdAndUpdate(
    { _id: user.userId },
    { $set: { ...payload } },
    {
      new: true,
    },
  );

  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update business information',
    );
  }

  const nextStep = getNextOnboardingStep(result);

  return {
    nextStep,
    result,
  };
};

const getProfessionalProfile = async (
  user: JwtPayload,
): Promise<IProfessional | null> => {
  const result = await Professional.findById({
    _id: user.userId,
  }).populate<{ auth: Partial<IUser> }>('auth', {
    name: 1,
    email: 1,
    role: 1,
    profile: 1,
    status: 1,
  });
  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Requested professional profile not found',
    );
  }
  // const { status } = result?.auth as unknown as IUser;
  if (result?.auth?.status === 'delete') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Requested professional profile has been deleted.',
    );
  }
  return result as unknown as IProfessional;
};

const getSingleProfessional = async (id: string) => {
  const result = await Professional.findById(id).populate<{
    auth: Partial<IUser>;
  }>('auth', {
    name: 1,
    email: 1,
    role: 1,
    profile: 1,
    status: 1,
  });
  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Requested professional not found',
    );
  }

  if (result.auth.status === 'delete') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Requested professional profile has been deleted.',
    );
  }
  return result;
};

const getAllProfessional = async (
  filterOptions: IProfessionalFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const {
    searchTerm,
    category,
    subCategory,
    subSubCategory,
    date,
    minPrice,
    maxPrice,
    city,
  } = filterOptions;
  console.log(filterOptions);
  const anyCondition: any[] = [];
  if (searchTerm) {
    const regex = new RegExp(searchTerm, 'i');

    if (city) {
      anyCondition.push({ address: { $regex: city, $options: 'i' } });
    }
    // Run queries in parallel
    const [professionalsMatch, servicesMatch] = await Promise.all([
      Professional.find({
        $or: [
          { serviceType: regex },
          { targetAudience: regex },
          { businessName: regex },
          { address: regex },
          { description: regex },
        ],
      }).distinct('_id'),
      Service.find({
        $or: [{ title: regex }, { description: regex }],
      }).select('createdBy'),
    ]);

    const combinedIds = [
      ...new Set([
        ...professionalsMatch,
        ...servicesMatch.map((service) => service.createdBy),
      ]),
    ];

    anyCondition.push({ _id: { $in: combinedIds } });
  }

  if (category || subCategory || subSubCategory) {
    // Prepare the filter conditions
    const filterConditions = [];

    if (category) {
      filterConditions.push({ category: category });
    }

    if (subCategory) {
      filterConditions.push({ subCategory: subCategory });
    }

    if (subSubCategory) {
      filterConditions.push({ subSubCategory: subSubCategory });
    }
    console.log(filterConditions);
    const servicesWithConditions = await Service.find(
      { $or: filterConditions },
      {
        createdBy: 1,
      },
    ).distinct('createdBy');

    anyCondition.push({ _id: { $in: servicesWithConditions } });
  }

  if (minPrice && maxPrice) {
    const priceFilterCondition = QueryHelper.rangeQueryHelper(
      'price',
      minPrice,
      maxPrice,
    );
    const servicesWithBudget = await Service.find(
      priceFilterCondition,
    ).distinct('createdBy');

    anyCondition.push({ _id: { $in: servicesWithBudget } });
  }

  if (date) {
    const requestedDay = parse(
      date,
      'dd-MM-yyyy',
      new Date(),
    ).toLocaleDateString('en-US', { weekday: 'long' });

    const availableProfessionals = await Schedule.find({
      days: { day: requestedDay },
    }).distinct('professional');

    anyCondition.push({ _id: { $in: availableProfessionals } });
  }

  const activeProfessional = await User.find(
    {
      status: 'active',
    },
    '_id',
  ).distinct('_id');

  anyCondition.push({ auth: { $in: activeProfessional } });

  const professionals = await Professional.find({ $and: anyCondition })
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy || 'createdAt']: sortOrder === 'desc' ? -1 : 1 });

  const total = await Professional.countDocuments({ $and: anyCondition });

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: professionals,
  };
};

const managePortfolio = async (
  user: JwtPayload,
  portfolioImage: { path: string; link?: string } | null,
  removedImages: string[] | [],
) => {
  const session = await Professional.startSession();
  session.startTransaction();

  try {
    // 🖼️ Upload New Portfolio Image
    let uploadedImage: { path: string; link?: string } | null = null;
    if (portfolioImage?.path) {
      const uploadedImages = await uploadToCloudinary(
        portfolioImage.path,
        'portfolio',
        'image',
      );

      if (uploadedImages && uploadedImages.length > 0) {
        uploadedImage = {
          path: uploadedImages[0],
          link: portfolioImage.link || undefined,
        };
      } else {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to upload image to Cloudinary',
        );
      }
    }

    // 🗑️ Delete Removed Images
    if (removedImages.length > 0) {
      console.log(removedImages);
      await deleteResourcesFromCloudinary(removedImages, 'image', true);
    }

    // 📝 Update Portfolio in Database
    const updateQuery: any = {};

    if (uploadedImage) {
      updateQuery.$push = {
        portfolio: uploadedImage,
      };
    }

    if (removedImages.length > 0) {
      updateQuery.$pull = {
        portfolio: {
          path: { $in: removedImages },
        },
      };
    }

    const result = await Professional.findOneAndUpdate(
      { _id: user.userId },
      updateQuery,
      { new: true, session },
    );

    if (!result) {
      // Rollback uploaded image if the database update fails
      if (uploadedImage) {
        await deleteResourcesFromCloudinary(
          [uploadedImage.path],
          'image',
          true,
        );
      }
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Could not update portfolio, please try again',
      );
    }

    // ✅ Commit Transaction
    await session.commitTransaction();
    return result;
  } catch (error) {
    // ❌ Rollback Transaction
    await session.abortTransaction();

    // Rollback uploaded image if an error occurs
    if (portfolioImage) {
      await deleteResourcesFromCloudinary(portfolioImage.path, 'image', true);
    }

    throw error;
  } finally {
    session.endSession();
  }
};

export const ProfessionalService = {
  updateProfessionalProfile,
  getBusinessInformationForProfessional,
  getProfessionalProfile,
  getAllProfessional,
  getSingleProfessional,
  managePortfolio,
};
