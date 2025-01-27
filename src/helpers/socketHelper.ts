import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import { stopTracking } from './reservationHelper';

const socket = (io: Server) => {
  io.on('connection', (socket) => {
    logger.info(colors.blue('A user connected'));

     // Handling live tracking
     socket.on('liveTracking', async data => {
      try {
        const { reservationId, latitude, longitude } = data;
        if (!reservationId || latitude == null || longitude == null) {
          return;
        }

        // Check for delivery status
        const updatedReservation = await stopTracking(reservationId, longitude, latitude);
        if (!updatedReservation) {
          return;
        }
        // Emit live tracking data
        io.emit(`reservationTracking::${reservationId}`, {
          longitude: longitude,
          latitude: latitude,
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Error in liveTracking: ${error.message}`);
        } else {
          logger.error('Error in liveTracking: unknown error');
        }
      }
    });

    //disconnect
    socket.on('disconnect', () => {
      logger.info(colors.red('A user disconnect'));
    });
  });
};

export const socketHelper = { socket };
