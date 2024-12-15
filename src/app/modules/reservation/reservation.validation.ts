import { z } from 'zod';

const reservationValidationZodSchema = z.object({
  body: z.object({
    service: z.string().nonempty('Service ID is required'), // MongoDB ObjectId as a string
    serviceType: z.enum(['home', 'in-place'], {
      required_error: 'Service type is required',
    }),
    professional: z.string().nonempty('Professional ID is required'), // MongoDB ObjectId as a string
    date: z.string({
      required_error: 'Date is required',
    }),
    time: z.string().nonempty('Time is required'),
    subSubCategory: z.string({ required_error: 'SubSubCategory is required' }), // MongoDB ObjectId as a string
    serviceLocation: z.object({
      type: z.literal('Point').optional().default('Point'),
      coordinates: z
        .array(z.number())
        .length(
          2,
          'Coordinates must have exactly two numbers [longitude, latitude]',
        )
        .default([0, 0]),
    }),
  }),
});

const reservationStatusChangeZodValidation = z.object({
  body: z.object({
    status: z.enum(['accepted', 'rejected', 'completed', 'confirmed']),
    amount: z.number().optional(),
    isStarted: z.boolean().optional(),
  }),
});

const confirmReservationZodSchema = z.object({
  body: z.object({
    amount: z.number({ required_error: 'Amount is required' }),
  }),
});
export const ReservationValidations = {
  reservationValidationZodSchema,
  reservationStatusChangeZodValidation,
  confirmReservationZodSchema,
};
