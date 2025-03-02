import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import { stopTracking } from './reservationHelper';
import config from '../config';
import { Message } from '../app/modules/message/message.model';
import { Types } from 'mongoose';

const socket = (io: Server) => {
  io.on('connection', (socket) => {
    logger.info(colors.blue('A user connected'));

    socket.on('reservationTracking', async data => {
      try {
        const { professionalId, location } = data;
        if (!professionalId || !location) {
          return;
        }
        // console.log(professionalId,location)
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


    socket.on(`messageRead::${config.message_read_token}`, async data => {
      //update all messages to read for given chatID
      const { chatId, receiverId } = data;
      if (!chatId) {
        return;
      }
      await Message.updateMany({ chatId, isRead: false, receiverId: new Types.ObjectId(receiverId) }, { isRead: true });
    })

    //disconnect
    socket.on('disconnect', () => {
      logger.info(colors.red('A user disconnect'));
    });
  });
};

export const socketHelper = { socket };
