import { z } from 'zod'
import { USER_ROLES } from '../../../enums/user'

// Create a Zod schema for user creation
const createUserZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format').toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    role: z.string({
      required_error: 'Role is required',
    }),
  }),
})

// Create a Zod schema for updating a user
const updateUserZodSchema = z.object({
  status: z.enum(['active', 'restricted', 'delete']).optional(),
  verified: z.boolean().optional(),
  authentication: z
    .object({
      isResetPassword: z.boolean().optional(),
      oneTimeCode: z.number().nullable().optional(),
      expireAt: z.date().nullable().optional(),
    })
    .optional(),
})

export const UserValidation = {
  createUserZodSchema,
  updateUserZodSchema,
}
