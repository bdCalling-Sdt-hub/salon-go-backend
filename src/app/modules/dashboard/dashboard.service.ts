import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Professional } from '../professional/professional.model';
import { Reservation } from '../reservation/reservation.model';
import { User } from '../user/user.model';
import { Review } from '../review/review.model';
import { USER_ROLES } from '../../../enums/user';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IPaginationOptions } from '../../../types/pagination';
import { JwtPayload } from 'jsonwebtoken';
import {
  IDashboardCustomerFilters,
  IDashboardProfessionalFilters,
} from './dasboard.interface';
import { professionalDashboardSearchableFields } from './dashboard.constant';
import { Customer } from '../customer/customer.model';
import { IReservationFilterableFields } from '../reservation/reservation.interface';
import { Types } from 'mongoose';

const getGeneralStats = async () => {
  try {
    // Total users
    const totalUsers = await User.countDocuments();

    // New signups in the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newSignups = await User.countDocuments({
      createdAt: { $gte: oneWeekAgo },
    });

    const activeProfessionalsResult = await Professional.aggregate([
      {
        $lookup: {
          from: 'users', // Collection name for the referenced auth module
          localField: 'auth',
          foreignField: '_id',
          as: 'authDetails',
        },
      },
      { $unwind: '$authDetails' },
      {
        $match: {
          'authDetails.status': 'active',
          isFreelancer: false,
        },
      },
      {
        $count: 'count', // Renaming the count field to 'count'
      },
    ]);

    const activeFreelancersResult = await Professional.aggregate([
      {
        $lookup: {
          from: 'users', // Collection name for the referenced auth module
          localField: 'auth',
          foreignField: '_id',
          as: 'authDetails',
        },
      },
      { $unwind: '$authDetails' },
      {
        $match: {
          'authDetails.status': 'active',
          isFreelancer: true,
        },
      },
      {
        $count: 'count', // Renaming the count field to 'count'
      },
    ]);

    const activeCustomerResult = await Customer.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'auth',
          foreignField: '_id',
          as: 'authDetails',
        },
      },
      { $unwind: '$authDetails' },
      {
        $match: {
          'authDetails.status': 'active',
        },
      },
      {
        $count: 'count',
      },
    ]);

    const activeCustomers =
      activeCustomerResult.length > 0 ? activeCustomerResult[0].count : 0;

    const activeProfessionals =
      activeProfessionalsResult.length > 0
        ? activeProfessionalsResult[0].count
        : 0;

    const activeFreelancers =
      activeFreelancersResult.length > 0 ? activeFreelancersResult[0].count : 0;

    // Total orders completed
    const totalOrdersCompleted = await Reservation.countDocuments({
      status: 'completed',
    });

    return {
      totalUsers,
      newSignups,
      activeCustomers,
      activeProfessionals,
      activeFreelancers,
      totalOrdersCompleted,
    };
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to retrieve general stats',
    );
  }
};

const getReservationRate = async () => {
  try {
    // Total completed reservations
    const totalReservations = await Reservation.countDocuments({
      status: 'completed',
    });

    if (totalReservations === 0) {
      return { freelancer: '0%', team: '0%' }; // Avoid division by zero
    }

    // Reservations for freelancers
    const freelancerReservations = await Reservation.countDocuments({
      status: 'completed',
      professional: {
        $in: await Professional.find({ isFreelancer: true }).distinct('_id'),
      },
    });

    // Reservations for team professionals
    const teamReservations = totalReservations - freelancerReservations;

    // Calculate percentage
    const freelancerRate = (
      (freelancerReservations / totalReservations) *
      100
    ).toFixed(2);
    const teamRate = ((teamReservations / totalReservations) * 100).toFixed(2);

    return {
      freelancer: `${freelancerRate}%`,
      team: `${teamRate}%`,
    };
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to calculate reservation rate',
    );
  }
};

const getTopProfessionals = async () => {
  // Step 1: Fetch professionals with review count and average rating
  const professionalsWithRatings = await Professional.aggregate([
    {
      $project: {
        name: 1,
        image: 1,
        isFreelance: 1,
        totalReviews: 1,
        rating: 1, // Average rating
      },
    },
    {
      $match: {
        totalReviews: { $gte: 3 }, // Include professionals with at least 3 reviews
      },
    },
    {
      $addFields: {
        weightedRating: {
          $add: [
            { $multiply: ['$rating', '$totalReviews'] }, // Weight based on reviews
            { $divide: ['$totalReviews', 10] }, // Small boost for higher review counts
          ],
        },
      },
    },
    {
      $sort: { weightedRating: -1 },
    },
    {
      $limit: 10, // Fetch top 10 professionals (freelancers + non-freelancers)
    },
  ]);

  // Step 2: Split professionals into freelancers and non-freelancers
  const freelancers = professionalsWithRatings.filter(
    (professional) => professional.isFreelance,
  );
  const nonFreelancers = professionalsWithRatings.filter(
    (professional) => !professional.isFreelance,
  );

  // Step 3: Combine data for freelancers and non-freelancers
  const processProfessionals = (professionals: any[]) => {
    return professionals.map((professional) => ({
      professionalId: professional._id,
      name: professional.name,
      image: professional.image,
      averageRating: professional.rating,
      reviewCount: professional.totalReviews,
      weightedRating: professional.weightedRating,
    }));
  };

  // Step 4: Get top 5 freelancers and top 5 non-freelancers
  const topFreelancers = processProfessionals(freelancers).slice(0, 5);
  const topNonFreelancers = processProfessionals(nonFreelancers).slice(0, 5);

  // Return both lists
  return {
    topFreelancers,
    topNonFreelancers,
  };
};

const getFreelancerVsProfessional = async () => {
  // Step 1: Fetch all completed reservations along with professional details
  const totalReservations = await Reservation.aggregate([
    {
      $lookup: {
        from: 'professionals', // Collection name for professionals
        localField: 'professional', // Foreign key in reservations
        foreignField: '_id', // Key in professionals
        as: 'professionalDetails',
      },
    },
    { $unwind: '$professionalDetails' }, // Unwind professionalDetails for easier grouping
    {
      $group: {
        _id: '$professionalDetails.isFreelancer', // Group by freelancer status
        totalReservations: { $sum: 1 },
      },
    },
  ]);

  // Step 2: Fetch completed reservations grouped by freelancer status
  const completedReservations = await Reservation.aggregate([
    {
      $match: { status: 'completed' }, // Match only completed reservations
    },
    {
      $lookup: {
        from: 'professionals',
        localField: 'professional', // Foreign key in reservations
        foreignField: '_id', // Key in professionals
        as: 'professionalDetails',
      },
    },
    { $unwind: '$professionalDetails' }, // Unwind professionalDetails for easier processing
    {
      $group: {
        _id: '$professionalDetails.isFreelancer', // Group by freelancer status
        totalCompleted: { $sum: 1 }, // Sum completed reservations
      },
    },
  ]);
  console.log(completedReservations);
  // Map data for freelancer and professional completion rates
  const freelancerData = completedReservations.find(
    (data) => data._id === true,
  ) || { totalCompleted: 0 };
  const professionalData = completedReservations.find(
    (data) => data._id === false,
  ) || { totalCompleted: 0 };
  console.log(freelancerData, professionalData);
  const totalFreelancerReservations = totalReservations.find(
    (data) => data._id === true,
  ) || { totalReservations: 0 };
  const totalProfessionalReservations = totalReservations.find(
    (data) => data._id === false,
  ) || { totalReservations: 0 };

  // Calculate completion rates
  const freelancerCompletionRate = totalFreelancerReservations.totalReservations
    ? (freelancerData.totalCompleted /
        totalFreelancerReservations.totalReservations) *
      100
    : 0;

  const professionalCompletionRate =
    totalProfessionalReservations.totalReservations
      ? (professionalData.totalCompleted /
          totalProfessionalReservations.totalReservations) *
        100
      : 0;

  // Return the calculated rates
  return {
    freelancerCompletionRate: freelancerCompletionRate.toFixed(2),
    professionalCompletionRate: professionalCompletionRate.toFixed(2),
  };
};

//professional

const getAllProfessionalForAdmin = async (
  filterOptions: IDashboardProfessionalFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const { searchTerm, ...filters } = filterOptions;
  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: professionalDashboardSearchableFields.map((field) => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }

  if (filters) {
    andConditions.push({
      $and: Object.entries(filters).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};
  console.log(andConditions);
  console.log(whereConditions);
  const result = await Professional.find(whereConditions)
    .populate('auth')
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder });

  const total = await Professional.countDocuments(whereConditions);

  return {
    meta: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

//customer
const getAllCustomerForAdmin = async (
  filterOptions: IDashboardCustomerFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const { searchTerm, ...filters } = filterOptions;
  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: professionalDashboardSearchableFields.map((field) => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }

  if (filters) {
    andConditions.push({
      $and: Object.entries(filters).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Customer.find(whereConditions)
    .populate('auth')
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder });

  const total = await Customer.countDocuments(whereConditions);

  return {
    meta: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

const getAllReservationsFromDB = async (
  filters: IReservationFilterableFields,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const { ...filtersData } = filters;

  const andConditions = [];

  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Reservation.find(whereConditions)
    .populate({
      path: 'professional',
      select: { auth: 1 },
      populate: { path: 'auth', select: { name: 1 } },
    })
    .populate({
      path: 'customer',
      select: { auth: 1 },
      populate: { path: 'auth', select: { name: 1 } },
    })
    .populate({
      path: 'service',
      select: { title: 1 },
    })
    .populate({
      path: 'subSubCategory',
      select: { name: 1 },
    })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  const total = await Reservation.countDocuments(whereConditions);

  return {
    meta: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

const getUserWiseReservationsFromDB = async (
  id: string,
  filters: IReservationFilterableFields,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const filtersData = { ...filters };
  const andConditions: any[] = [];

  // Add filters to the query
  if (Object.keys(filtersData).length) {
    andConditions.push(
      ...Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    );
  }

  // Add professional or customer-specific condition
  andConditions.push({
    $or: [
      { professional: new Types.ObjectId(id) },
      { customer: new Types.ObjectId(id) },
    ],
  });

  // Combine all conditions
  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};
  console.log(whereConditions);
  // Fetch reservations
  const result = await Reservation.find(whereConditions)
    .sort({ [sortBy || 'createdAt']: sortOrder === 'desc' ? -1 : 1 })
    .skip(skip)
    .limit(limit);

  // Fetch total count for pagination
  const total = await Reservation.countDocuments(whereConditions);

  return {
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  };
};

//------------------------------

const generateTimeSlots = async (
  startTime: string,
  endTime: string,
  interval: number,
) => {
  console.log(startTime, endTime, interval);

  // Helper function to convert time string (e.g., '9:30 am') to minutes from midnight
  const timeToMinutes = (time: string): number => {
    const [timePart, period] = time.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);
    let totalMinutes = (hours % 12) * 60 + minutes; // Convert hours to 12-hour format

    if (period.toLowerCase() === 'pm') {
      totalMinutes += 12 * 60; // Add 12 hours for PM
    }

    return totalMinutes;
  };

  // Helper function to convert minutes from midnight back to 12-hour time format (hh:mm am/pm)
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 12 || 12; // Hours in 12-hour format
    const mins = minutes % 60;
    const period = minutes < 720 ? 'am' : 'pm'; // Determine AM/PM based on minutes
    return `${hours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const slots: string[] = [];
  let current = startMinutes;

  // Loop through and create slots with the interval, no gap
  while (current + interval <= endMinutes) {
    slots.push(minutesToTime(current)); // Add slot at current time
    current += interval; // Add interval for the next slot
  }

  return slots;
};

export const DashboardServices = {
  getGeneralStats,
  getReservationRate,
  getTopProfessionals,
  getFreelancerVsProfessional,
  //professional
  getAllProfessionalForAdmin,
  //customer
  getAllCustomerForAdmin,
  //reservations
  getAllReservationsFromDB,
  getUserWiseReservationsFromDB,
  //-----------
  generateTimeSlots,
};
