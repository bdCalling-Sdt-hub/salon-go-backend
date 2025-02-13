import { StatusCodes } from 'http-status-codes';
import ApiError from '../errors/ApiError';
import { Reservation } from '../app/modules/reservation/reservation.model';
import { calculateDistance } from '../utils/locationHelper';


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const stopTracking = async (
  reservationId: string,
  longitude: number,
  latitude: number
) => {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found');
  }
  const { serviceLocation } = reservation;

  const distance = calculateDistance(
    [serviceLocation.coordinates[0], serviceLocation.coordinates[1]],
    [longitude, latitude]
  );

  if (distance < 0.03) {
    await delay(180000); // Wait for 3 minutes (180,000 ms)

    const updatedReservation = await Reservation.findByIdAndUpdate(
      reservationId,
      { $set: { status: 'confirmed' } },
      { new: true } // Returns the updated document
    );

    if (!updatedReservation) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to update reservation status'
      );
    }

    //@ts-ignore
    global.io.emit(`reservationStopped::${reservationId}`, updatedReservation.toObject()); // Emit plain JSON object
    return updatedReservation; // Return the updated order
  }

  return null; // Return null if distance condition isn't met
};
