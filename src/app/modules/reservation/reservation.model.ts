import { Schema, model } from 'mongoose';
import { IReservation, ReservationModel } from './reservation.interface';

const reservationSchema = new Schema<IReservation, ReservationModel>({
  service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  serviceType: { type: String, enum: ['home', 'in-place'], required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  professional: {
    type: Schema.Types.ObjectId,
    ref: 'Professional',
    required: true,
  },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'rejected', 'confirmed', 'completed'],
    default: 'pending',
  },
  subSubCategory: { type: Schema.Types.ObjectId, ref: 'SubSubCategory' },
  travelFee: { type: Number },
  serviceLocation: {
    type: { type: String, default: 'Point', enum: ['Point'] },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude] // Default to [0, 0] if coordinates are not provided
  },
});

export const Reservation = model<IReservation, ReservationModel>(
  'Reservation',
  reservationSchema,
);
