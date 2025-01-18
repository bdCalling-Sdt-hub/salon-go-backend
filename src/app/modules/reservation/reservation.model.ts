import { Schema, model } from 'mongoose';
import { IReservation, ReservationModel } from './reservation.interface';

const reservationSchema = new Schema<IReservation, ReservationModel>(
  {
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    serviceType: { type: String, enum: ['home', 'in-place'], required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    professional: {
      type: Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'pending',
        'rejected',
        'confirmed',
        'completed',
        'canceled',
        'started',
      ],
      default: 'pending',
    },
    subSubCategory: { type: Schema.Types.ObjectId, ref: 'SubSubCategory' },
    travelFee: { type: Number },
    serviceLocation: {
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: { type: [Number], default: [0, 0] },
    },
    serviceStartDateTime: { type: Date },
    serviceEndDateTime: { type: Date },
    duration: { type: Number, required: true },
    isStarted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reservationSchema.index({ customer: 1 });
reservationSchema.index({ professional: 1 });
reservationSchema.index({ status: 1, professional: 1 });

export const Reservation = model<IReservation, ReservationModel>(
  'Reservation',
  reservationSchema,
);
