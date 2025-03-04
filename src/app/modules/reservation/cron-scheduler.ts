import { Types } from 'mongoose';
import cron from 'node-cron';
import { Reservation } from './reservation.model';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { DateHelper } from '../../../utils/date.helper';
import { ReservationHelper } from './reservation.utils';
import { logger } from '../../../shared/logger';
import { sendDataWithSocket, sendNotification } from '../../../helpers/sendNotificationHelper';
import { USER_ROLES } from '../../../enums/user';
import { populate } from 'dotenv';

export const cronScheduler = async () => {
  console.log(`Hey I am cron job updating the reservations every minute 🕧`);
  const session = await Reservation.startSession();  // Start a session for transaction
  session.startTransaction();  // Begin transaction
  const localDate = new Date();
  // Get the time zone offset in minutes
  const offset = localDate.getTimezoneOffset();
  
  // Adjust the date to the local time by subtracting the offset
  localDate.setMinutes(localDate.getMinutes() - offset);

  localDate.setHours(localDate.getHours() - 1);
  
console.log(localDate)
  

  try {
    // Get all reservations that are not yet marked as 'completed' and are in-progress
    const reservations = await Reservation.find({
      status: { $in: ['confirmed', 'started'] },
      serviceStartDateTime: { $lte: localDate },
      serviceEndDateTime: { $gte: localDate },
    }).select({
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
      notified: 1,
 
    })
      .populate('review', {
        _id: 0,
        rating: 1,
      })
      .populate<{service: {_id: Types.ObjectId, title: string, category: {_id: Types.ObjectId, name: string} }}>({
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
      .populate<{ professional: {_id: Types.ObjectId, businessName: string, address: string, location: string, auth: { _id: Types.ObjectId, deviceId: string } }}>({
        path: 'professional',
        select: {
          _id: 1,
          businessName: 1,
          address: 1,
          location: 1,
          auth: 1,
        },
        populate: {
          path: 'auth',
          select: { _id: 1, deviceId: 1 },
        },
      })
      .populate<{ customer: {_id: Types.ObjectId, auth: {_id: Types.ObjectId, name: string; address: string; profile: string; contact: string; deviceId: string } } }>({
        path: 'customer',
        select: {
          _id: 1,
          auth: 1,
        },
        populate: {
          path: 'auth',
          select: { _id: 1, name: 1, address: 1, profile: 1, contact: 1, deviceId: 1 },
        },
      });

    const notificationPayloads = []; // Array to store notification payloads


    
if(reservations.length > 0){
        
  for (const reservation of reservations) {

    const reservationStartTime = reservation.serviceStartDateTime;
    const reservationEndTime = reservation.serviceEndDateTime;
    const timeDifference = reservationStartTime.getMinutes() - localDate.getMinutes(); // Difference in minutes
    localDate.setHours(localDate.getHours() + 1);

      if (timeDifference <= 30 && timeDifference > 0 && !reservation.notified) {
        const customerDeviceId = reservation.customer?.auth?.deviceId;
        const professionalDeviceId = reservation.professional?.auth?.deviceId;

        const customerNotification = {
          userId: reservation.customer._id,
        title: 'Upcoming Reservation',
        message: `Hey ${reservation.customer.auth.name},\nYour reservation for ${reservation.service.title} is starting in 30 minutes. Please be ready.`,
        type: 'USER',

        }

        const professionalNotification = {
          userId: reservation.professional._id,
          title: 'Upcoming Reservation',
          message: `Hey ${reservation.professional.businessName},\nYour reservation for ${reservation.service.title} is starting in 30 minutes. Please be ready.`,
          type: 'PROFESSIONAL',
        };

        // Collect notification payloads to be sent concurrently later
        notificationPayloads.push({
          reservation,
          customerDeviceId,
          professionalDeviceId,
          customerNotification,
          professionalNotification,
        });
      }

    // Update reservation status to 'started' if it's confirmed and the start time has passed
   else if (reservation.status === 'confirmed' && reservationStartTime <= localDate && !reservation.isStarted) {
      reservation.status = 'started';
      reservation.isStarted = true;
      await reservation.save({ session });
      await sendDataWithSocket(`reservationStarted`, reservation.professional._id, reservation);
      await sendDataWithSocket(`reservationStarted`, reservation.customer._id, reservation);
    }

    // Update reservation status to 'completed' if it's started and the end time has passed
    else if (reservation.status === 'started' && reservationEndTime <= localDate) {
      const startTime = DateHelper.parseTimeTo24Hour(DateHelper.convertISOTo12HourFormat(reservation.serviceStartDateTime.toString()));
      const endTime = DateHelper.parseTimeTo24Hour(DateHelper.convertISOTo12HourFormat(reservation.serviceEndDateTime.toString()));

      await ReservationHelper.updateTimeSlotAvailability(
        reservation.professional._id,
        reservation.serviceStartDateTime,
        startTime,
        endTime,
        session,
        true
      );

      reservation.status = 'completed';
      await reservation.save({ session });
      logger.info(`Reservation ${reservation._id} marked as completed`);

      // Notify both customer and professional
      await sendDataWithSocket(`reservationCompleted`, reservation.professional._id, reservation);
      await sendDataWithSocket(`reservationCompleted`, reservation.customer._id, reservation);
    }

  
  }
}
    

    // Phase 1: Commit transaction FIRST before sending notifications
    await session.commitTransaction();
    logger.info('Database updates committed successfully');

    // Phase 2: Send notifications (non-transactional)
    const notificationPromises = notificationPayloads.map(({ reservation, customerDeviceId, professionalDeviceId, customerNotification, professionalNotification }) => {
      console.log(customerDeviceId,professionalDeviceId)
      return Promise.all([
        sendNotification('getNotification', reservation.customer._id, customerNotification, {
          deviceId: customerDeviceId,
          destination: 'customer',
          role: USER_ROLES.USER,
          id: reservation._id.toString(),
        }),
        sendNotification('getNotification', reservation.professional._id, professionalNotification, {
          deviceId: professionalDeviceId,
          destination: 'professional',
          role: USER_ROLES.PROFESSIONAL,
          id: reservation._id.toString(),
        }),
      ]);
    });

    // Wait for all notification promises to complete
    await Promise.all(notificationPromises);


  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    logger.error('Transaction aborted due to error:', error);
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error while updating reservations');
  } finally {
    // End the session
    await session.endSession();
  }
};
