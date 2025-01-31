import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import { stopTracking } from './reservationHelper';

const socket = (io: Server) => {
  io.on('connection', (socket) => {
    logger.info(colors.blue('A user connected'));

   


    socket.on('reservationTracking', async data => {
      try {
        const { professionalId, location } = data;
        if (!professionalId || !location) {
          return;
        }
console.log(professionalId,location)
        socket.emit(`reservationTracking::${professionalId}`, {
          location,
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
