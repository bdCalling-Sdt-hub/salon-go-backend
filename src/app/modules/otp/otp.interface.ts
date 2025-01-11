import { Model } from 'mongoose';

export type IOtp = {
  phoneNumber: string;
  otp: string;
  createdAt: Date;
  expiresAt: Date; // OTP expiration timestamp
  requestCount: number; // Number of OTP requests within the timeframe
  lastRequestAt: Date; // Timestamp of the last OTP request
};

export type IOtpModel = Model<IOtp>;
