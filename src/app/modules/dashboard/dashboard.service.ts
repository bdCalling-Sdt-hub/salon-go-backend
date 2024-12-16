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
import { IDashboardProfessionalFilters } from './dasboard.interface';
import { professionalDashboardSearchableFields } from './dashboard.constant';

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

    // Active professionals
    const activeProfessionals = await Professional.countDocuments({
      'auth.status': 'active',
    }).populate('auth');

    // Active freelancers
    const activeFreelancers = await Professional.countDocuments({
      isFreelancer: true,
      'auth.status': 'active',
    }).populate('auth');

    // Total orders completed
    const totalOrdersCompleted = await Reservation.countDocuments({
      status: 'completed',
    });

    return {
      totalUsers,
      newSignups,
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
  // Step 1: Get professionals with reviews (average rating)
  const professionalsWithReviews = await Review.aggregate([
    {
      $group: {
        _id: '$professional',
        averageRating: { $avg: '$rating' },
      },
    },
    {
      $sort: { averageRating: -1 },
    },
    {
      $limit: 10, // We fetch top 10 to split them later into freelancers and non-freelancers
    },
  ]);

  // Extract professional IDs from the reviews data
  const professionalIds = professionalsWithReviews.map((p) => p._id);

  // Step 2: Get the completed reservations count
  const completedReservationsData = await Reservation.aggregate([
    {
      $match: {
        professional: { $in: professionalIds },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: '$professional',
        completedReservations: { $sum: 1 },
      },
    },
  ]);

  // Step 3: Get freelancer and non-freelancer data from the Professional model
  const professionals = await Professional.find({
    _id: { $in: professionalIds },
  });

  // Step 4: Split professionals into freelancers and non-freelancers
  const freelancers = professionals.filter(
    (professional) => professional?.isFreelance,
  );
  const nonFreelancers = professionals.filter(
    (professional) => !professional?.isFreelance,
  );

  // Step 5: Combine data from reviews, reservations, and professionals
  const processProfessionals = (
    professionals: any[],
    completedReservationsData: any[],
  ) => {
    return professionals.map((professional) => {
      const review = professionalsWithReviews.find(
        (p) => p._id.toString() === professional._id.toString(),
      );
      const reservationData = completedReservationsData.find(
        (reservation) =>
          reservation._id.toString() === professional._id.toString(),
      );

      return {
        professionalId: professional._id,
        name: professional.name,
        image: professional.image,
        successRate: review ? review.averageRating : 0,
        completedReservations: reservationData
          ? reservationData.completedReservations
          : 0,
      };
    });
  };

  // Step 6: Get top 5 freelancers and top 5 non-freelancers
  const topFreelancers = processProfessionals(
    freelancers,
    completedReservationsData,
  ).slice(0, 5);
  const topNonFreelancers = processProfessionals(
    nonFreelancers,
    completedReservationsData,
  ).slice(0, 5);

  // Return both lists
  return {
    topFreelancers,
    topNonFreelancers,
  };
};

//professional

const getAllProfessionalForAdmin = async (
  user: JwtPayload,
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

  andConditions.push({ role: USER_ROLES.PROFESSIONAL });

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Professional.find(whereConditions)
    .populate('auth')
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder });

  const total = await Professional.countDocuments({
    role: USER_ROLES.PROFESSIONAL,
  });

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
  user: JwtPayload,
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

  andConditions.push({ role: USER_ROLES.PROFESSIONAL });

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Professional.find(whereConditions)
    .populate('auth')
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder });

  const total = await Professional.countDocuments({
    role: USER_ROLES.PROFESSIONAL,
  });

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

  //professional
  getAllProfessionalForAdmin,
  //customer
  getAllCustomerForAdmin,

  //-----------
  generateTimeSlots,
};
