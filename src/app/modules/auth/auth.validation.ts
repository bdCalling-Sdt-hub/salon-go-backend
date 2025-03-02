import { z } from 'zod';

const createVerifyEmailOrPhoneZodSchema = z.object({
  body: z.object({
    email: z.string().optional(),
    contact: z.string().optional(),
    oneTimeCode: z.number({ required_error: 'One time code is required' }),
  }),
});

const createVerifyPhoneZodSchema = z.object({
  body: z.object({
    contact: z.string({ required_error: 'Contact is required' }),
    oneTimeCode: z.number({ required_error: 'One time code is required' }),
  }),
});

const createLoginZodSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
    password: z.string({ required_error: 'Password is required' }),
    // deviceId: z.string({ required_error: 'Device ID is required' }),
  }),
});

const createForgetPasswordZodSchema = z.object({
  body: z.object({
    email: z.string().optional(),
    contact: z.string().optional(),
  }),
});

const createResetPasswordZodSchema = z.object({
  body: z.object({
    newPassword: z.string({ required_error: 'Password is required' }),
    confirmPassword: z.string({
      required_error: 'Confirm Password is required',
    }),
  }),
});

const createChangePasswordZodSchema = z.object({
  body: z.object({
    currentPassword: z.string({
      required_error: 'Current Password is required',
    }),
    newPassword: z.string({ required_error: 'New Password is required' }),
    confirmPassword: z.string({
      required_error: 'Confirm Password is required',
    }),
  }),
});

const createSocialLoginZodSchema = z.object({
  body: z.object({
    appId: z.string({ required_error: 'App ID is required' }),
    deviceId: z.string({ required_error: 'Device ID is required' }),
  }),
});

const deleteAccountZodSchema = z.object({
  body: z.object({
    password: z.string({ required_error: 'Password is required' }),
  }),
});

const createVerifyTheUserAfterOtpZodSchema = z.object({
  body: z.object({
    contact: z.string({ required_error: 'Contact is required' })
  }),
});

export const AuthValidation = {
  createVerifyEmailOrPhoneZodSchema,
  createForgetPasswordZodSchema,
  createLoginZodSchema,
  createResetPasswordZodSchema,
  createChangePasswordZodSchema,
  deleteAccountZodSchema,
  createVerifyPhoneZodSchema,
  createSocialLoginZodSchema,
  createVerifyTheUserAfterOtpZodSchema,
};
