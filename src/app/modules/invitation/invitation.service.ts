import { JwtPayload } from 'jsonwebtoken';
import { IInvitation } from './invitation.interface';
import { Invitation } from './invitation.model';
import { handleNotificationForInvitation } from '../../../helpers/sendNotificationHelper';
import { Professional } from '../professional/professional.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { Reservation } from '../reservation/reservation.model';

// const sendInvitation = async (payload: IInvitation, user: JwtPayload) => {
//   const { userId } = user;
//   payload.sender = userId;

//   const isValidUser = await Professional.findById({ userId, status: 'active' });

//   const FIFTEEN_DAYS_IN_MS = 15 * 24 * 60 * 60 * 1000; // 15 days in milliseconds

//   const lastInvitation = await Invitation.findOne(
//     { sender: userId },
//     { createdAt: 1 },
//   ).sort({ createdAt: -1 });

//   if (lastInvitation) {
//     const lastInvitationDate = new Date(lastInvitation.createdAt);
//     const now = Date.now();

//     // Check if the interval is greater than 15 days
//     const interval = now - lastInvitationDate.getTime();
//     if (interval <= FIFTEEN_DAYS_IN_MS) {
//       throw new Error(
//         'You can only send an invitation after 15 days from the last one.',
//       );
//     }
//   }

//   if (!isValidUser) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
//   }

//   const invitation = await Invitation.create(payload);
//   if (!invitation) {
//     throw new Error('Failed to create invitation');
//   }

//   const reservation = await Reservation.find({
//     status: 'completed',
//     customer: userId,
//   });

//   await handleNotificationForInvitation('getNotification', {
//     users: invitation?.users as Types.ObjectId[],
//     title: `${isValidUser?.businessName} has set you an invitation.`,
//     message: `Please visit our salon profile to get information about our services and prices.`,
//     type: 'USER',
//   });

//   return invitation;
// };

const sendInvitation = async (payload: IInvitation, user: JwtPayload) => {
  const { userId } = user;
  payload.sender = userId;

  const isValidUser = await Professional.findOne({
    _id: userId,
    status: 'active',
  });

  const FIFTEEN_DAYS_IN_MS = 15 * 24 * 60 * 60 * 1000;

  const lastInvitation = await Invitation.findOne(
    { sender: userId },
    { createdAt: 1 },
  ).sort({ createdAt: -1 });

  if (lastInvitation) {
    const lastInvitationDate = new Date(lastInvitation.createdAt);
    const now = Date.now();
    const interval = now - lastInvitationDate.getTime();
    if (interval <= FIFTEEN_DAYS_IN_MS) {
      throw new Error(
        'You can only send an invitation after 15 days from the last one.',
      );
    }
  }

  if (!isValidUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const invitation = await Invitation.create(payload);
  if (!invitation) {
    throw new Error('Failed to create invitation');
  }

  const notifications = [];

  for (const invitedUserId of invitation.users) {
    const reservations = await Reservation.find({
      status: 'completed',
      customer: invitedUserId,
    })
      .populate({ path: 'services', select: { name: 1 } }) // Assuming `services` is an array
      .sort({ completedAt: -1 });

    let lastVisitMessage = 'No previous visit history.';
    if (reservations.length > 0) {
      const lastVisit = reservations[0];
      const lastVisitDate = new Date(lastVisit.createdAt).toLocaleDateString();
      const serviceNames = (lastVisit.service as any).name;
      lastVisitMessage = `Your last visit was on ${lastVisitDate} for the following services: ${serviceNames}.`;
    }

    notifications.push({
      userId: invitedUserId.toString(),
      title: `${isValidUser?.businessName} has sent you an invitation.`,
      message: `Please visit our salon profile to get information about our services and prices. ${lastVisitMessage}`,
      type: 'USER',
    });
  }

  await handleNotificationForInvitation('getNotification', notifications);

  return invitation;
};
export const InvitationServices = {
  sendInvitation,
};
