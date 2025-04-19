import { Types } from 'mongoose';
import cron from 'node-cron';
import { Reservation } from './reservation.model';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { DateHelper } from '../../../utils/date.helper';
import { ReservationHelper } from './reservation.utils';
import { logger } from '../../../shared/logger';
import {
  sendDataWithSocket,
  sendNotification,
} from '../../../helpers/sendNotificationHelper';
import { USER_ROLES } from '../../../enums/user';
import { DateTime } from 'luxon';

// Define the timezone where reservations are made (Algeria)
const RESERVATION_TIMEZONE = 'Africa/Algiers';

export const cronScheduler = async () => {
  console.log(`Hey I am cron job updating the reservations every minute 🕧`);
  const session = await Reservation.startSession();
  session.startTransaction();

  // Get current time in Algeria timezone
  const nowInAlgeria = DateTime.now().setZone(RESERVATION_TIMEZONE);
  console.log(`Current time in Algeria: ${nowInAlgeria.toISO()}`);

  try {
    // Get all reservations that need to be processed
    // Since dates are stored in Algerian time, we can compare directly with nowInAlgeria
    const reservations = await Reservation.find({
      status: { $in: ['confirmed', 'started'] },
      // Only get reservations that are relevant for processing
      $or: [
        // For notifications: starting within the next hour
        {
          serviceStartDateTime: {
            $gte: nowInAlgeria.toJSDate(),
            $lte: nowInAlgeria.plus({ minutes: 60 }).toJSDate(),
          },
          notified: false,
        },
        // For status updates: already started or should be completed
        { serviceStartDateTime: { $lte: nowInAlgeria.toJSDate() } },
        { serviceEndDateTime: { $lte: nowInAlgeria.toJSDate() } },
      ],
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
        notified: 1,
      })
      // Keep your existing populate chain
      .populate('review', {
        _id: 0,
        rating: 1,
      })
      .populate<{
        service: {
          _id: Types.ObjectId;
          title: string;
          category: { _id: Types.ObjectId; name: string };
        };
      }>({
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
      .populate<{
        professional: {
          _id: Types.ObjectId;
          businessName: string;
          address: string;
          location: string;
          auth: { _id: Types.ObjectId; deviceId: string };
        };
      }>({
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
      .populate<{
        customer: {
          _id: Types.ObjectId;
          auth: {
            _id: Types.ObjectId;
            name: string;
            address: string;
            profile: string;
            contact: string;
            deviceId: string;
          };
        };
      }>({
        path: 'customer',
        select: {
          _id: 1,
          auth: 1,
        },
        populate: {
          path: 'auth',
          select: {
            _id: 1,
            name: 1,
            address: 1,
            profile: 1,
            contact: 1,
            deviceId: 1,
          },
        },
      });

    const notificationPayloads = []; // Array to store notification payloads
    const reservationsToUpdate = []; // Track reservations that need updates

    if (reservations.length > 0) {
      for (const reservation of reservations) {
        // Convert reservation times to Luxon DateTime objects in Algeria timezone
        const reservationStartTime = DateTime.fromJSDate(
          reservation.serviceStartDateTime,
          { zone: RESERVATION_TIMEZONE },
        );
        const reservationEndTime = DateTime.fromJSDate(
          reservation.serviceEndDateTime,
          { zone: RESERVATION_TIMEZONE },
        );

        // Calculate minutes until reservation starts
        const minutesUntilStart = reservationStartTime.diff(
          nowInAlgeria,
          'minutes',
        ).minutes;

        // Check if notification should be sent (between 25-35 minutes before start)
        if (
          minutesUntilStart <= 35 &&
          minutesUntilStart > 0 &&
          !reservation.notified
        ) {
          const customerDeviceId = reservation.customer?.auth?.deviceId;
          const professionalDeviceId = reservation.professional?.auth?.deviceId;
          console.log(
            `Sending notification for reservation ${reservation._id}`,
          );

          const customerNotification = {
            userId: reservation.customer._id,
            title: 'Upcoming Reservation',
            message: `Hey ${reservation.customer.auth.name},\nYour reservation for ${reservation.service.title} is starting in about 30 minutes. Please be ready.`,
            type: 'USER',
          };

          const professionalNotification = {
            userId: reservation.professional._id,
            title: 'Upcoming Reservation',
            message: `Hey ${reservation.professional.businessName},\nYour reservation for ${reservation.service.title} is starting in about 30 minutes. Please be ready.`,
            type: 'PROFESSIONAL',
          };

          // Collect notification payloads
          notificationPayloads.push({
            reservation,
            customerDeviceId,
            professionalDeviceId,
            customerNotification,
            professionalNotification,
          });

          // Mark as notified
          reservation.notified = true;
          reservationsToUpdate.push(reservation);
        }
        // Update reservation status to 'started' if it's confirmed and the start time has passed
        else if (
          reservation.status === 'confirmed' &&
          reservationStartTime <= nowInAlgeria &&
          !reservation.isStarted
        ) {
          console.log(`Updating reservation ${reservation._id} to 'started'`);
          reservation.status = 'started';
          reservation.isStarted = true;
          reservationsToUpdate.push(reservation);

          // Prepare socket notifications (will be sent after commit)
          await sendDataWithSocket(
            `reservationStarted`,
            reservation.professional._id,
            reservation,
          );
          await sendDataWithSocket(
            `reservationStarted`,
            reservation.customer._id,
            reservation,
          );
        }
        // Update reservation status to 'completed' if it's started and the end time has passed
        else if (
          reservation.status === 'started' &&
          reservationEndTime <= nowInAlgeria
        ) {
          const startTime = DateHelper.parseTimeTo24Hour(
            DateHelper.convertISOTo12HourFormat(
              reservation.serviceStartDateTime.toString(),
            ),
          );
          const endTime = DateHelper.parseTimeTo24Hour(
            DateHelper.convertISOTo12HourFormat(
              reservation.serviceEndDateTime.toString(),
            ),
          );

          await ReservationHelper.updateTimeSlotAvailability(
            reservation.professional._id,
            reservation.serviceStartDateTime,
            startTime,
            endTime,
            session,
            true,
          );

          console.log(`Updating reservation ${reservation._id} to 'completed'`);

          reservation.status = 'completed';
          reservationsToUpdate.push(reservation);
          logger.info(`Reservation ${reservation._id} marked as completed`);

          // Prepare socket notifications (will be sent after commit)
          await sendDataWithSocket(
            `reservationCompleted`,
            reservation.professional._id,
            reservation,
          );
          await sendDataWithSocket(
            `reservationCompleted`,
            reservation.customer._id,
            reservation,
          );
        }
      }
    }

    // Save all updated reservations in a single batch
    if (reservationsToUpdate.length > 0) {
      const savePromises = reservationsToUpdate.map((reservation) =>
        reservation.save({ session }),
      );
      await Promise.all(savePromises);
      logger.info(`Updated ${reservationsToUpdate.length} reservations`);
    }

    // Phase 1: Commit transaction FIRST before sending notifications
    await session.commitTransaction();
    logger.info('Database updates committed successfully');

    // Phase 2: Send notifications (non-transactional)
    if (notificationPayloads.length > 0) {
      const notificationPromises = notificationPayloads.map(
        ({
          reservation,
          customerDeviceId,
          professionalDeviceId,
          customerNotification,
          professionalNotification,
        }) => {
          return Promise.allSettled([
            customerDeviceId
              ? sendNotification(
                  'getNotification',
                  reservation.customer._id,
                  customerNotification,
                  {
                    deviceId: customerDeviceId,
                    destination: 'customer',
                    role: USER_ROLES.USER,
                    id: reservation._id.toString(),
                  },
                )
              : Promise.resolve(),
            professionalDeviceId
              ? sendNotification(
                  'getNotification',
                  reservation.professional._id,
                  professionalNotification,
                  {
                    deviceId: professionalDeviceId,
                    destination: 'professional',
                    role: USER_ROLES.PROFESSIONAL,
                    id: reservation._id.toString(),
                  },
                )
              : Promise.resolve(),
          ]);
        },
      );

      // Wait for all notification promises to complete
      const results = await Promise.all(notificationPromises);
      logger.info(
        `Sent notifications for ${notificationPayloads.length} reservations`,
      );
    }
  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    logger.error('Transaction aborted due to error:', error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Error while updating reservations',
    );
  } finally {
    // End the session
    await session.endSession();
  }
};
