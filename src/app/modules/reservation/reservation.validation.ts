import { z } from 'zod';

const reservationValidationZodSchema = z.object({
  body: z.object({
    service: z.string().nonempty('Service ID is required'), // MongoDB ObjectId as a string
    professional: z.string().nonempty('Professional ID is required'), // MongoDB ObjectId as a string
    date: z.string({
      required_error: 'Date is required',
    }),
    time: z.string().nonempty('Time is required'),
    serviceLocation: z
      .object({
        // type: z.literal('Point'),
        coordinates: z
          .array(z.number())
          .length(
            2,
            'Coordinates must have exactly two numbers [longitude, latitude]',
          ),
      })
      .optional(),
    amount: z.number().optional(),
  }),
});

const reservationStatusChangeZodValidation = z.object({
  body: z.object({
    status: z.enum(
      ['accepted', 'rejected', 'completed', 'confirmed', 'started'],
      {},
    ),
    amount: z.number().optional(),
    isStarted: z.boolean().optional(),
  }),
});

const confirmReservationZodSchema = z.object({
  body: z.object({
    amount: z.number({ required_error: 'Amount is required' }),
  }),
});

const updateReservationZodSchema = z.object({
  body: z.object({
    amount: z.number().optional(),
    status: z.enum(
      ['accepted', 'rejected', 'completed', 'confirmed', 'started', 'canceled'],
      { required_error: 'Status is required' },
    ),
  }),
});
export const ReservationValidations = {
  reservationValidationZodSchema,
  reservationStatusChangeZodValidation,
  confirmReservationZodSchema,
  updateReservationZodSchema,
};
