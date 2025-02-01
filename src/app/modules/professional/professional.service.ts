import { JwtPayload } from 'jsonwebtoken';
import { parse } from 'date-fns';
import { IPaginationOptions } from '../../../types/pagination';

import { IProfessional, IProfessionalFilters } from './professional.interface';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Professional } from './professional.model';
import { Service } from '../service/service.model';
import getNextOnboardingStep, {
  getDateRangeAndIntervals,
  uploadImageAndHandleRollback,
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

import { Types } from 'mongoose';
import { Bookmark } from '../bookmark/bookmark.model';
import { ICategory, ISubCategory } from '../categories/categories.interface';
import { Reservation } from '../reservation/reservation.model';
import { Review } from '../review/review.model';

const updateProfessionalProfile = async (
  user: JwtPayload,
  payload: Partial<IProfessional & IUser>,
) => {
  const { profile, KBIS, ID, socialLinks, ...restData } = payload;

  const userExist = await Professional.findById(user.userId).populate<{
    auth: IUser;
  }>({ path: 'auth', select: { profile: 1 } });
  if (!userExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Professional not found!');
  }

  const session = await Professional.startSession();
  session.startTransaction();

  try {
    // 🖼️ Handle profile image upload
    let uploadedImageUrl: string | null = null;
    if (profile) {
      uploadedImageUrl = await uploadImageAndHandleRollback(
        profile,
        'professional',
        'image',
      );
    }

    // 📝 Update User Profile
    if (uploadedImageUrl) {
      const userUpdateResult = await User.findByIdAndUpdate(
        { _id: user.id },
        { $set: { profile: uploadedImageUrl } },
        { new: true, session },
      );
      if (!userUpdateResult?.profile) {
        await deleteResourcesFromCloudinary(uploadedImageUrl, 'image', true);
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to update user profile.',
        );
      }

      // Remove old image from cloudinary
      const { profile: oldProfile } = userExist.auth;
      if (oldProfile && uploadedImageUrl) {
        await deleteResourcesFromCloudinary(oldProfile, 'image', true);
      }
    }

    // 📝 Update Professional Profile
    let updatedData: Partial<IProfessional> = {
      ...restData,
    };
    if (socialLinks) {
      updatedData.socialLinks = socialLinks;
    }

    // Handle KBIS and ID uploads
    if (KBIS) {
      updatedData.KBIS = await uploadImageAndHandleRollback(
        KBIS,
        'professional/kbis',
        'image',
      );
      console.log(updatedData, 'KBIS');
    }
    if (ID) {
      updatedData.ID = await uploadImageAndHandleRollback(
        ID,
        'professional/id',
        'image',
      );
    }

    // Update the Professional profile
    const result = await Professional.findByIdAndUpdate(
      user.userId,
      { $set: updatedData },
      { new: true, session },
    );
    if (!result) {
      if (updatedData.KBIS) {
        await deleteResourcesFromCloudinary(updatedData.KBIS, 'image', true);
      }
      if (updatedData.ID) {
        await deleteResourcesFromCloudinary(updatedData.ID, 'image', true);
      }
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update profile!');
    }

    // Remove old images from cloudinary
    const { KBIS: oldKBIS, ID: oldID } = userExist;
    if (oldKBIS && updatedData.KBIS) {
      await deleteResourcesFromCloudinary(oldKBIS, 'image', true);
    }
    if (oldID && updatedData.ID) {
      await deleteResourcesFromCloudinary(oldID, 'image', true);
    }
    if (oldKBIS && updatedData.KBIS) {
      await deleteResourcesFromCloudinary(oldKBIS, 'image', true);
    }

    // ✅ Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    return result as IProfessional;
  } catch (error) {
    // ❌ Rollback the transaction on failure
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getBusinessInformationForProfessional = async (
  user: JwtPayload,
  payload: Partial<IProfessional>,
) => {
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
  console.log(nextStep);
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
  })
    .populate<{ auth: Partial<IUser> }>('auth', {
      name: 1,
      email: 1,
      role: 1,
      profile: 1,
      status: 1,
    })
    .populate('categories', { name: 1 })
    .populate('subCategories', { name: 1 })
    .lean();

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

const getSingleProfessional = async (id: string, user: JwtPayload) => {
  const result = await Professional.findById(id)
    .populate<{
      auth: Partial<IUser>;
    }>('auth', {
      name: 1,
      email: 1,
      role: 1,
      profile: 1,
      status: 1,
    })
    .populate('categories', { name: 1 })
    .populate('subCategories', { name: 1 });

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

  const bookmarkedProfessionals = await Bookmark.findOne({
    customer: user.userId,
    professional: id,
  });

  if (bookmarkedProfessionals) {
    result.isBookmarked = true;
  }

  return { isBookmarked: result.isBookmarked ?? false, result };
};

const getAllProfessional = async (
  filterOptions: IProfessionalFilters,
  paginationOptions: IPaginationOptions,
  user: JwtPayload,
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
    offers,
    city,
  } = filterOptions;

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

    if (category) filterConditions.push({ category });
    if (subCategory) filterConditions.push({ subCategory });
    if (subSubCategory) filterConditions.push({ subSubCategory });

    const servicesWithConditions = await Service.find(
      { $or: filterConditions },
      { createdBy: 1 },
    ).distinct('createdBy');

    anyCondition.push({ _id: { $in: servicesWithConditions } });
  }

  //check if offer is true get the professionals with offers
  if (Boolean(offers)) {
    const professionalsWithOffers = await Schedule.find({
      'days.timeSlots.discount': { $gt: 0 },
    }).distinct('professional');

    anyCondition.push({ _id: { $in: professionalsWithOffers } });
  }

  if (minPrice && maxPrice) {
    const priceFilterCondition = await QueryHelper.rangeQueryHelper(
      'price',
      Number(minPrice),
      Number(maxPrice),
    );
    const servicesWithBudget = await Service.find(
      priceFilterCondition,
    ).distinct('createdBy');

    anyCondition.push({ _id: { $in: servicesWithBudget } });
  }

  if (date) {
    const requestedDay = parse(
      date,
      'dd/MM/yyyy',
      new Date(),
    ).toLocaleDateString('en-US', { weekday: 'long' });

    const availableProfessionals = await Schedule.find({
      days: { day: requestedDay },
    }).distinct('professional');

    anyCondition.push({ _id: { $in: availableProfessionals } });
  }

  const activeProfessionals = await User.find(
    {
      status: 'active',
      approvedByAdmin: true,
    },
    '_id',
  ).distinct('_id');

  anyCondition.push({ auth: { $in: activeProfessionals } });

  const professionals = await Professional.find(
    { $and: anyCondition },
    {
      KBIS: 0,
      ID: 0,
      updatedAt: 0,
      previouslyUsedTools: 0,
      scheduleId: 0,
      subCategories: 0,
      helpingTags: 0,
    },
  )
    .populate<{ auth: IUser }>('auth', { profile: 1, status: 1, name: 1 })
    .populate<{ categories: ICategory }>({
      path: 'categories',
      select: 'name',
    })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Professional.countDocuments({
    $and: anyCondition,
  });

  const [bookmarkedProfessionals, schedules] = await Promise.all([
    Bookmark.find({ customer: user.userId, professional: { $in: activeProfessionals } }).distinct('professional'),
    Schedule.find({ professional: { $in: professionals.map((p) => p._id) } }).lean(),
  ]);

  // Create a map for quick lookup
  const schedulesMap = new Map(
    schedules.map((schedule) => [schedule.professional.toString(), schedule]),
  );

  const enrichProfessional = await Promise.all(
    professionals.map(async (professional) => {
      // Get the schedule from the map
      const schedule = schedulesMap.get(professional._id.toString());

      // Calculate maximum discount
      let maxDiscount = 0;
      if (schedule) {
        schedule.days.forEach((day) => {
          day.timeSlots.forEach((slot) => {
            if (slot.discount && Number(slot.discount) > maxDiscount) {
              maxDiscount = Number(slot.discount);
            }
          });
        });
      }

      return {
        ...professional,
        isBookmarked: bookmarkedProfessionals
          .map((_id) => _id.toString())
          .includes(professional._id.toString()),
        discount: maxDiscount,
        rating: professional.rating || 0,
        totalReviews: professional.totalReviews || 0,
      };
    }),
  );

  // Sort the enriched professionals by rating (primary) and discount (secondary)
  const sortedProfessionals = enrichProfessional.sort((a, b) => {
    // First, compare by rating
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }
    // If ratings are equal, compare by discount
    return b.discount - a.discount;
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: sortedProfessionals,
  };
};

const getProfessionalPortfolio = async (professionalId: Types.ObjectId) => {
  const professional = await Professional.findById(professionalId, 'portfolio');
  return professional?.portfolio;
};

const managePortfolio = async (
  user: JwtPayload,
  portfolioImage: { path: string; link?: string } | null,
  removedImages: string[] | [],
  updatedImage?: { url: string; link: string },
) => {
  console.log(portfolioImage, removedImages, updatedImage);
  const session = await Professional.startSession();
  session.startTransaction();
  try {
    if (updatedImage && removedImages.length === 0 && !portfolioImage) {
      //find the updatedImage and update that particular image link
      await Professional.updateOne(
        { _id: user.userId, 'portfolio.path': updatedImage.url },
        { 'portfolio.$.link': updatedImage.link || undefined },
      );
      console.log(removedImages, 'removedImages');
    } else {
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
        await deleteResourcesFromCloudinary(removedImages, 'image', true);
      }

      let result;
      if (removedImages.length > 0) {
        result = await Professional.updateOne(
          { _id: user.userId },
          { $pull: { portfolio: { path: { $in: removedImages } } } },
          { session },
        );
      }

      if (uploadedImage) {
        result = await Professional.updateOne(
          { _id: user.userId },
          { $push: { portfolio: uploadedImage } },
          { session },
        );
      }

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
    }

    // ✅ Commit Transaction
    await session.commitTransaction();
    return 'Portfolio updated successfully';
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
const getProfessionalMetrics = async (user: JwtPayload, range: string) => {
  const { startDate, endDate } = getDateRangeAndIntervals(range);
  const totalRangeMilliseconds = endDate.getTime() - startDate.getTime();
  const segmentCount = 7; // Divide into 7 data points
  const segmentMilliseconds = totalRangeMilliseconds / segmentCount;

  // Function to generate keys based on range
  const getKeyForRange = (index: number) => {
    if (range === 'weekly') {
      const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      return days[index % 7];
    } else if (range === 'monthly') {
      const dayRanges = ['1-4', '5-8', '9-12', '13-16', '17-20', '21-24', '25-30'];
      return dayRanges[index];
    } else if (range === 'yearly') {
      const dayRanges = ['Jan-Feb', 'Mar-Apr', 'May-Jun', 'Jul-Aug', 'Sep-Oct', 'Nov','Dec'];
      return dayRanges[index];
    } else {
      return `S-${index + 1}`; // Default key for "all"
    }
  };

  // Perform the aggregation query for reservations
  const reservations = await Reservation.aggregate([
    {
      $match: {
        professional: new Types.ObjectId(user.userId),
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          $floor: {
            $divide: [
              { $subtract: ['$createdAt', startDate] },
              segmentMilliseconds,
            ],
          },
        },
        totalRevenue: { $sum: '$amount' },
        totalReservations: { $sum: 1 },
        completedReservations: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed pending confirmed'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Helper to create segments
  const createSegments = (callback: { (index: any, matchingReservation: any): { key: string; value: any; }; (index: any, matchingReservation: any): { key: string; value: number; }; (index: any, matchingReservation: any): { key: string; value: any; }; (arg0: number, arg1: any, arg2: Date, arg3: Date): any; }) => {
    return Array.from({ length: segmentCount }, (_, index) => {
      const segmentStartDate = new Date(startDate.getTime() + index * segmentMilliseconds);
      const segmentEndDate = new Date(segmentStartDate.getTime() + segmentMilliseconds);
      const matchingReservation = reservations.find((r) => r._id === index);

      return callback(index, matchingReservation, segmentStartDate, segmentEndDate);
    });
  };

  // Process revenue data
  const revenueData = createSegments((index: any, matchingReservation: { totalRevenue: any; }) => {
    const totalRevenue = matchingReservation ? matchingReservation.totalRevenue : 0;
    return {
      key: getKeyForRange(index),
      value: totalRevenue,
    };
  });

  // Process engagement data
  const engagementData = createSegments((index: any, matchingReservation: { totalReservations: any; completedReservations: any; }) => {
    const totalReservations = matchingReservation ? matchingReservation.totalReservations : 0;
    const completedReservations = matchingReservation ? matchingReservation.completedReservations : 0;
    const engagementRate = totalReservations > 0 ? (completedReservations / totalReservations) * 100 : 0;

    return {
      key: getKeyForRange(index),
      value: Number(engagementRate.toFixed(2)),
    };
  });

  // Process reservation count data
  const reservationData = createSegments((index: any, matchingReservation: { totalReservations: any; }) => {
    const reservationCount = matchingReservation ? matchingReservation.totalReservations : 0;
    return {
      key: getKeyForRange(index),
      value: reservationCount,
    };
  });

  // Calculate totals
  const totalRevenueSum = revenueData.reduce((sum, item) => sum + item.value, 0);
  const totalEngagement = engagementData.reduce((sum, item) => sum + item.value, 0);
  const totalReservationCount = reservationData.reduce((sum, item) => sum + item.value, 0);

  // Return formatted results
  return {
    statusCode: 200,
    success: true,
    message: 'Metrics retrieved successfully',
    data: [
      {
        total: totalRevenueSum,
        data: revenueData,
      },
      {
        total: totalEngagement,
        data: engagementData,
      },
      {
        total: totalReservationCount,
        data: reservationData,
      },
    ],
  };
};




export const ProfessionalService = {
  updateProfessionalProfile,
  getBusinessInformationForProfessional,
  getProfessionalProfile,
  getAllProfessional,
  getSingleProfessional,
  managePortfolio,
  getProfessionalPortfolio,
  getProfessionalMetrics
};

    