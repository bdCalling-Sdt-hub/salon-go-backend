import { groupBy } from 'lodash';
import { USER_ROLES } from './../../../enums/user';
import { LocationHelper } from './../../../utils/locationHelper';
import { StatusCodes } from 'http-status-codes';
import { Professional } from '../professional/professional.model';
import {
  IReservation,
  IReservationFilterableFields,
} from './reservation.interface';
import ApiError from '../../../errors/ApiError';
import { Schedule } from '../schedule/schedule.model';
import { Reservation } from './reservation.model';
import { ReservationHelper } from './reservation.utils';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { JwtPayload } from 'jsonwebtoken';
import mongoose, {  Types } from 'mongoose';
import { DateHelper } from '../../../utils/date.helper';
import { format, isAfter, isBefore } from 'date-fns';
import {
  sendDataWithSocket,
  sendNotification,
} from '../../../helpers/sendNotificationHelper';
import { Customer } from '../customer/customer.model';
import { IUser } from '../user/user.interface';
import { IService } from '../service/service.interface';
import { Service } from '../service/service.model';
import { IProfessional } from '../professional/professional.interface';
import { sendPushNotification } from '../../../helpers/pushNotificationHelper';

const createReservationToDB = async (
  payload: IReservation,
  user: JwtPayload,
) => {
  const { professional, date, time, serviceLocation, amount, serviceAddress } =
    payload;


  const [isProfessionalExists, isCustomerExist, isServiceExist] =
    await Promise.all([
      Professional.findById(professional).populate<{ auth: IUser }>('auth'),
      Customer.findById(user.userId).populate<{
        auth: IUser;
      }>('auth', {
        name: 1,
        status: 1,
        profile: 1,
        deviceId: 1,
      }),
      Service.findById(payload.service, {
        title: 1,
        subSubCategory: 1,
        price: 1,
        duration: 1,
      }),
    ]);

  if (isCustomerExist?.auth.status !== 'active') {
    throw new ApiError(StatusCodes.NOT_FOUND, 'You are not allowed to book');
  }

  if (!isProfessionalExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Professional doesn't exist!");
  }

  if (!isServiceExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service doesn't exist!");
  }

  const { auth, isFreelancer, location, travelFee, teamSize, serviceType } =
    isProfessionalExists;

  if (auth.status !== 'active') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The requested professional cannot be booked right now!',
    );
  }

  const schedule = await Schedule.findOne(
    {
      professional: professional,
      'days.day': format(date, 'EEEE'),
    },
    {
      'days.$': 1,
    },
  );

  if (!schedule) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The requested professional is not available for the requested day',
    );
  }

  const { days } = schedule;

  const serviceStartDateTime = DateHelper.convertToISODate(time, date);
  const serviceEndDateTime = DateHelper.convertToISODate(
    DateHelper.calculateEndTime(time, isServiceExist.duration),
    date,
  );

  const operationStartTime = DateHelper.convertToISODate(
    days[0].startTime,
    date,
  );
  const operationEndTime = DateHelper.convertToISODate(days[0].endTime, date);

  const serviceStart = new Date(serviceStartDateTime);
  const serviceEnd = new Date(serviceEndDateTime);
  const operationStart = new Date(operationStartTime);
  const operationEnd = new Date(operationEndTime);



  if (
    isBefore(serviceStart, operationStart) ||
    isAfter(serviceEnd, operationEnd)
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The requested professional cannot be booked right now!',
    );
  }

  //set service id and professional id with sub sub category id to payload
  payload.service = isServiceExist._id;
  payload.professional = isProfessionalExists._id;
  payload.subSubCategory = isServiceExist.subSubCategory;
  payload.serviceType = serviceType as string;
  payload.customer = user.userId;
  payload.serviceStartDateTime = serviceStart;
  payload.serviceEndDateTime = serviceEnd;
  payload.amount = amount || isServiceExist.price;

  if (!location || !location.coordinates) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Professional location data is incomplete!',
    );
  }
  payload.serviceLocation =
    serviceLocation !== undefined ? serviceLocation : location;
  payload.serviceAddress =
    serviceAddress !== undefined
      ? serviceAddress || ''
      : serviceType === 'home'
      ? isCustomerExist.address || ''
      : isProfessionalExists.address || '';

  if (isFreelancer) {
    const isNotAvailable = await Reservation.exists({
      professional,
      date,
      status: { $in: ['confirmed'] },
      serviceStartDateTime: { $lt: serviceEndDateTime },
      serviceEndDateTime: { $gt: serviceStartDateTime },
    });

    if (isNotAvailable) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Professional is not available at this time!',
      );
    }

    const distance = LocationHelper.calculateDistance(
      [location.coordinates[0], location.coordinates[1]],
      [serviceLocation.coordinates[0], serviceLocation.coordinates[1]],
    );

    payload.travelFee = travelFee!.fee * distance;
    payload.amount = payload.amount + payload.travelFee;
  } else {
    const reservationCount = await Reservation.countDocuments({
      professional,
      date,
      status: { $in: ['confirmed'] },
      serviceStartDateTime: { $lt: serviceEndDateTime },
      serviceEndDateTime: { $gt: serviceStartDateTime },
    });

    if (reservationCount >= (teamSize?.max || 0)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Requested salon does not have any free professionals for this time.',
      );
    }
  }
  payload.duration = isServiceExist.duration;

  const result = await Reservation.create([payload]);

  if (!result.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create reservation');
  }

  // Format response data
  const formattedReservation = await Reservation.findById(result[0]._id)
    .select({
      _id: 1,
      amount: 1,
      date: 1,
      status: 1,
      travelFee: 1,
      serviceStartDateTime: 1,
      serviceEndDateTime: 1,
      serviceType: 1,
      isStarted: 1,
      duration: 1,
      serviceLocation: 1,
      address: 1,
    })
    .populate('review', {
      _id: 0,
      rating: 1,
    })
    .populate({
      path: 'service',
      select: {
        _id: 0,
        title: 1,
      },
      populate: {
        path: 'category',
        select: {
          _id: 0,
          name: 1,
        },
      },
    })
    .populate('subSubCategory', {
      _id: 0,
      name: 1,
    })
    .populate('professional', {
      _id: 1,
      businessName: 1,
      address: 1,
      location: 1,
    })
    .populate({
      path: 'customer',
      select: { auth: 1 },
      populate: {
        path: 'auth',
        select: { name: 1, address: 1, profile: 1 },
      },
    })
    .lean();

  await sendNotification('getNotification', isProfessionalExists._id, {
    userId: isProfessionalExists.auth._id,
    title: `You have a new reservation request from ${isCustomerExist.auth.name}`,
    message: `${isCustomerExist.auth.name} has requested a reservation for ${
      isServiceExist.title
    } on ${serviceStart.toDateString()}. Please check your dashboard for more details.`,
    type: USER_ROLES.PROFESSIONAL
  },
  {
    title: `You have a new reservation request from ${isCustomerExist.auth.name}`,
    message: `${isCustomerExist.auth.name} has requested a reservation for ${
      isServiceExist.title
    } on ${serviceStart.toDateString()}. Please check your dashboard for more details.`,
    deviceId: isProfessionalExists.auth.deviceId || 'fa-JVHQxTXm24r6NBoI1uQ:APA91bFhG2FTjMA547cuirYKvIOSYEnLpS9gpMlQ84y7kiNaF71-Azn_e64GWMYrB3NzTWUDeKyAh37eWQTmNiOGpRfNr0W80xntui5i90Q9EgROCZZVVkI',
    destination: 'professional',
    role: 'professional',
    id: isProfessionalExists._id as unknown as string,
    icon: isCustomerExist.auth.profile ,
  }
 
);



  if (formattedReservation) {
    await sendDataWithSocket(
      'reservationCreated',
      isProfessionalExists._id,
      formattedReservation,
    );
  }
  //send push notification to professional

  return formattedReservation;
};

const getSingleReservationFromDB = async (
  id: string,
  userId: Types.ObjectId,
) => {
  const isReservationExists = await Reservation.findById(id)
    .select({
      _id: 1,
      amount: 1,
      date: 1,
      status: 1,
      travelFee: 1,
      serviceStartDateTime: 1,
      serviceEndDateTime: 1,
      serviceType: 1,
      isStarted: 1,
      duration: 1,
      serviceLocation: 1,
      address: 1,
    })
    .populate('review', {
      _id: 0,
      rating: 1,
    })
    .populate({
      path: 'service',
      select: {
        _id: 0,
        title: 1,
      },
      populate: {
        path: 'category',
        select: {
          _id: 0,
          name: 1,
        },
      },
    })
    .populate('subSubCategory', {
      _id: 0,
      name: 1,
    })
    .populate('professional', {
      _id: 1,
      businessName: 1,
      address: 1,
      location: 1,
    })
    .populate({
      path: 'customer',
      select: { auth: 1 },
      populate: {
        path: 'auth',
        select: { name: 1, address: 1, profile: 1 },
      },
    })
    .lean();

  if (!isReservationExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Reservation not found');
  }

  return isReservationExists;
};

const getReservationsForUsersFromDB = async (
  user: JwtPayload,
  filters: IReservationFilterableFields,
  paginationOptions: IPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);
  const { status, subSubCategory, date } = filters;

  const andCondition: any[] = [];

  if (status) {
    if (status === 'all')
      andCondition.push({ status: { $in: ['rejected', 'completed'] } });
    else if (status === 'present') andCondition.push({ status: { $in: ['pending', 'confirmed'] } })
    else andCondition.push({ status });
  }
  if (subSubCategory) {
    andCondition.push({ subSubCategory });
  }
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    andCondition.push({
      serviceStartDateTime: { $gte: startOfDay, $lte: endOfDay },
    });
  }

  const query =
    user.role === USER_ROLES.PROFESSIONAL
      ? { professional: user.userId }
      : { customer: user.userId };

  // Fetch filtered reservations with pagination
  const reservations = await Reservation.find({
    $and: [query, ...andCondition],
  })
    .select({
      _id: 1,
      amount: 1,
      date: 1,
      status: 1,
      travelFee: 1,
      serviceStartDateTime: 1,
      serviceEndDateTime: 1,
      serviceType: 1,
      isStarted: 1,
      duration: 1,
      serviceLocation: 1,
      address: 1,
    })
    .populate('review', {
      _id: 0,
      rating: 1,
    })
    .populate({
      path: 'service',
      select: {
        _id: 0,
        title: 1,
      },
      populate: {
        path: 'category',
        select: {
          _id: 0,
          name: 1,
        },
      },
    })
    .populate('subSubCategory', {
      _id: 0,
      name: 1,
    })
    .populate('professional', {
      _id: 1,
      businessName: 1,
      address: 1,
      location: 1,
    })
    .populate({
      path: 'customer',
      select: { auth: 1 },
      populate: {
        path: 'auth',
        select: { name: 1, address: 1, profile: 1, contact: 1 },
      },
    })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();


    if (user.role !== USER_ROLES.PROFESSIONAL) {
      // Skip grouping for customers and return the raw filtered data
      const total = await Reservation.countDocuments({
        $and: [query, ...andCondition],
      });
      return {
        meta: {
          total,
          page,
          totalPage: Math.ceil(total / limit),
          limit,
        },
        data: {
          reservations,
        },
      };
    }

  // Group reservations by date and calculate totals
  const formatDate = (date: Date): string => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) return 'Today';

    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    return `${days[date.getDay()]}, ${
      months[date.getMonth()]
    } ${date.getDate()}`;
  };


  const groupedData = groupBy(reservations, (res) =>
    formatDate(new Date(res.serviceStartDateTime)),
  );

  const dailyReservations = Object.entries(groupedData).map(
    ([date, reservations]) => {
      const totalAmount = reservations.reduce(
        (total, reservation) =>
          total + reservation.amount + (reservation.travelFee ?? 0),
        0,
      );
      return { date, totalAmount, reservations };
    },
  );

  // Independent counts for confirmed and pending reservations (not affected by filters)
  const baseQuery = {
    $or: [{ customer: user.userId }, { professional: user.userId }],
  };
  const confirmedCount = await Reservation.countDocuments({
    ...baseQuery,
    status: 'confirmed',
  });
  const pendingCount = await Reservation.countDocuments({
    ...baseQuery,
    status: { $in: ['pending'] },
  });

  const allCount = await Reservation.countDocuments({
    ...baseQuery,
    status: { $in: ['rejected', 'completed'] },
  });

  const total = await Reservation.countDocuments({
    $and: [baseQuery, ...andCondition],
  });

  return {
    meta: {
      total,
      page,
      totalPage: Math.ceil(total / limit),
      limit,
    },
    data: {
      dailyReservations,
      confirmedCount,
      pendingCount,
      allCount,
    },
  };
};

const updateReservationStatusToDB = async (
  id: Types.ObjectId,
  payload: { status: string; amount?: number },
  user: JwtPayload,
) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const reservation = await Reservation.findById(id)
      .select({
        _id: 1,
        amount: 1,
        date: 1,
        status: 1,
        travelFee: 1,
        serviceStartDateTime: 1,
        serviceEndDateTime: 1,
        serviceType: 1,
        isStarted: 1,
        duration: 1,
        serviceLocation: 1,
        address: 1,
      })
      .populate('review', {
        _id: 0,
        rating: 1,
      })
      .populate({
        path: 'service',
        select: {
          _id: 0,
          title: 1,
        },
        populate: {
          path: 'category',
          select: {
            _id: 0,
            name: 1,
          },
        },
      })
      .populate('subSubCategory', {
        _id: 0,
        name: 1,
      })
      .populate('professional', {
        _id: 1,
        businessName: 1,
        address: 1,
        location: 1,
        contact: 1,
      })
      .populate({
        path: 'customer',
        select: { auth: 1 },
        populate: {
          path: 'auth',
          select: { name: 1, address: 1, profile: 1 },
        },
      })
      .session(session);

    if (!reservation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found');
    }

    const { professional, serviceStartDateTime, serviceEndDateTime, date } =
      reservation;

    const { status } = payload;

    if (status === 'confirmed') {
      const { amount } = payload;

      if (!reservation.professional._id.equals(user.userId)) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'You are not authorized to confirm this reservation',
        );
      }

      // Convert and parse time for slot updates
      const startTime = DateHelper.parseTimeTo24Hour(
        DateHelper.convertISOTo12HourFormat(serviceStartDateTime.toString()),
      );
      const endTime = DateHelper.parseTimeTo24Hour(
        DateHelper.convertISOTo12HourFormat(serviceEndDateTime.toString()),
      );

      const professionalData = await Professional.findById(user.userId).session(
        session,
      );
      if (!professionalData) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Professional not found');
      }

      const isFreelancer = professionalData?.isFreelancer ? true : false;
      const maxTeamSize = professionalData?.teamSize?.max || 0;

      // Handle freelancer or team-based reservation logic
      const hasReachedMaxTeamSize =
        await ReservationHelper.validateReservationConflicts(
          isFreelancer,
          professional._id,
          serviceStartDateTime,
          serviceEndDateTime,
          maxTeamSize,
          session,
        );

      if (hasReachedMaxTeamSize) {
        await ReservationHelper.updateTimeSlotAvailability(
          professional._id,
          date,
          startTime,
          endTime,
          session,
          false,
        );
      }
    } else if (status === 'canceled') {
      if (reservation.status !== 'confirmed') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Sorry you can't cancel this reservation. You can only cancel confirmed reservation.",
        );
      }

      if (
        (user.role === USER_ROLES.PROFESSIONAL &&
          !reservation.professional._id.equals(user.userId)) ||
        (user.role === USER_ROLES.USER &&
          !reservation.customer._id.equals(user.userId))
      ) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'You are not authorized to cancel this reservation',
        );
      }

      // Convert and parse time for slot updates
      const startTime = DateHelper.parseTimeTo24Hour(
        DateHelper.convertISOTo12HourFormat(serviceStartDateTime.toString()),
      );
      const endTime = DateHelper.parseTimeTo24Hour(
        DateHelper.convertISOTo12HourFormat(serviceEndDateTime.toString()),
      );

      await ReservationHelper.updateTimeSlotAvailability(
        professional._id,
        date,
        startTime,
        endTime,
        session,
        true,
      );
    } else if (status === 'completed') {
      if (reservation.status !== 'confirmed') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Sorry you can't mark this reservation as completed. You can only mark confirmed reservation as completed.",
        );
      }
      if (!reservation.professional._id.equals(user.userId)) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'You are not authorized to mark this reservation as completed',
        );
      }

      // Convert and parse time for slot updates
      const startTime = DateHelper.parseTimeTo24Hour(
        DateHelper.convertISOTo12HourFormat(serviceStartDateTime.toString()),
      );
      const endTime = DateHelper.parseTimeTo24Hour(
        DateHelper.convertISOTo12HourFormat(serviceEndDateTime.toString()),
      );

      await ReservationHelper.updateTimeSlotAvailability(
        professional._id,
        date,
        startTime,
        endTime,
        session,
        true,
      );
    } else if (status === 'rejected') {
      if (!reservation.professional.equals(user.userId)) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'You are not authorized to reject this reservation',
        );
      }
    }

    const result = await Reservation.findByIdAndUpdate(
      {
        _id: id,
      },
      {
        $set: {
          status: payload.status,
          amount: payload?.amount || reservation.amount,
        },
      },
      { new: true, session },
    );

    if (!result) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Failed to confirm reservation',
      );
    }



    const [isCustomerExist, isProfessionalExist] = await Promise.all([
      Customer.findById(result.customer)
        .populate<{ auth: IUser }>({
          path: 'auth',
          select: { name: 1, email: 1, status: 1 },
        })
        .session(session),
      Professional.findById(result.professional)
        .populate<{ auth: IUser }>({
          path: 'auth',
          select: { name: 1, email: 1, status: 1 },
        })
        .session(session),
    ]);


    if(!isCustomerExist || !isProfessionalExist){
      throw new ApiError(StatusCodes.NOT_FOUND, 'Customer or Professional not found');
    }

    reservation.status = result.status;
    reservation.amount = result.amount || reservation.amount;

    await sendDataWithSocket(
      `reservation${
        payload.status.charAt(0).toUpperCase() + status.substring(1)
      }`,
      reservation.customer._id, 
      {
        reservation,
      },
    );
    const { title } = reservation.service as Partial<IService>;
    const { businessName } = reservation.professional as Partial<IProfessional>;
    //TODO: check if the bug fix works or not
    const notificationUserId =
      status === 'confirmed' || status === 'completed' || status === 'rejected'
        ? isCustomerExist?.auth._id
        : status === 'canceled' && user.role === USER_ROLES.USER
        ? isProfessionalExist?.auth._id
        : isCustomerExist?.auth._id;

    const notificationUserRole =
      status === 'confirmed' || status === 'completed' || status === 'rejected'
        ? USER_ROLES.USER
        : status === 'canceled' && user.role === USER_ROLES.USER
        ? USER_ROLES.PROFESSIONAL
        : USER_ROLES.USER;

    await sendNotification('getNotification', reservation.customer._id, {
      userId: notificationUserId,
      title: `Your reservation for ${title} has been confirmed by ${businessName}.`,
      message: `You have a confirmed reservation for ${title} on ${date.toDateString()}. Please be on time.`,
      type: notificationUserRole,
    });

    await session.commitTransaction();
    return `Reservation ${status} successfully for ${title}`;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};



const startReservationTracking = async (id: string) => {
  const isReservationExist = await Reservation.findById({ _id: id, status: 'ongoing' });
  if (!isReservationExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found');
  }

  //check if the vendor already has any other order as started
  const professionalExist = await Reservation.findOne({
    professional: isReservationExist.professional,
    status: { $in: ['started'] },
    _id: { $ne: id },
  });

  if (professionalExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have an order in delivery process'
    );
  }

  const result = await Reservation.findOneAndUpdate(
    { _id: id, status: 'confirmed' },
    { $set: { status: 'started' } },
    { new: true }
  ).populate<{service: IService}>({
    path: 'service',
    select: {
      _id: 0,
      title: 1,
    },
  });

  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to change the order status'
    );
  }

  await sendNotification(
    'getNotification',
    result.customer as Types.ObjectId,
    {
      userId: result.customer as Types.ObjectId,
      title: `Live tracking for ${result.service.title} has been started.`,
      message: `You have a live tracking for ${result.service.title} on ${DateHelper.convertISOTo12HourFormat(
        result.serviceStartDateTime.toString()
      )}. Please be on time.`,
      type: USER_ROLES.USER,
    }
  );
  await sendDataWithSocket('startedReservation', result.customer as Types.ObjectId, {
    ...result,
  });

  return result;
};

export const ReservationServices = {
  createReservationToDB,
  getReservationsForUsersFromDB,
  getSingleReservationFromDB,

  updateReservationStatusToDB,

  startReservationTracking,
};
