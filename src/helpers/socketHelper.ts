import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import { stopTracking } from './reservationHelper';

const socket = (io: Server) => {
  io.on('connection', (socket) => {
    logger.info(colors.blue('A user connected'));

   


    socket.on('reservationTracking', async data => {
      try {
        const { professionalId, latitude, longitude } = data;
        if (!professionalId || latitude == null || longitude == null) {
          return;
        }

        socket.emit(`reservationTracking::${professionalId}`, {
          longitude: longitude,
          latitude: latitude,
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Error in reservationTracking: ${error.message}`);
        } else {
          logger.error('Error in reservationTracking: unknown error');
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
