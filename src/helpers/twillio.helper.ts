import twilio from 'twilio';

import { addMinutes } from 'date-fns';
import config from '../config';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const accountSid = config.twilio.account_sid;
const authToken = config.twilio.auth_token;
const twilioPhoneNumber = config.twilio.phone_number;
const client = twilio(accountSid, authToken);
import crypto from 'crypto';
import { Otp } from '../app/otp/otp.model';
import { User } from '../app/modules/user/user.model';
import mongoose, { Types } from 'mongoose';
import { Professional } from '../app/modules/professional/professional.model';
import { hashOtp } from '../utils/cryptoToken';

// Helper function to hash OTP

export const sendOtp = async (
  phoneNumber: string,
  id: Types.ObjectId,
): Promise<void> => {
  const existingOtp = await Otp.findOne({ phoneNumber });
  try {
    // Validate phone number format (E.164)
    if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Invalid phone number format.',
      );
    }

    // Rate limiting: Check OTP request count

    if (existingOtp) {
      const timeElapsed =
        Date.now() - new Date(existingOtp.lastRequestAt).getTime();
      const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds

      if (timeElapsed < tenMinutes && existingOtp.requestCount >= 3) {
        throw new Error('Too many OTP requests. Please try again later.');
      }

      // Increment request count or reset if outside the 10-minute window
      if (timeElapsed >= tenMinutes) {
        existingOtp.requestCount = 1;
        existingOtp.lastRequestAt = new Date();
      } else {
        existingOtp.requestCount += 1;
      }

      await existingOtp.save();
    }

    // Generate a random 5-digit OTP
    const otp = Math.floor(10000 + Math.random() * 99999).toString();
    const hashedOtp = hashOtp(otp); // Hash the OTP before saving

    // Set OTP expiration (e.g., 5 minutes)
    const expiresAt = addMinutes(new Date(), 5);

    // Save OTP in the database
    const newOtp = existingOtp
      ? Object.assign(existingOtp, { otp: hashedOtp, expiresAt })
      : new Otp({
          phoneNumber,
          otp: hashedOtp,
          createdAt: new Date(),
          expiresAt,
          requestCount: 1,
          lastRequestAt: new Date(),
        });

    await newOtp.save();

    // Send the OTP using Twilio

    const res = await client.messages.create({
      body: `Your Salon go one time verification code is ${otp}. It will expire in 5 minutes.`,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });
  } catch (error) {
    if (existingOtp) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to send OTP. Please try again later.',
      );
    } else {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        await User.findByIdAndDelete(id);
        await Professional.findOneAndDelete({ auth: id });

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to send OTP. Please try again later.',
        );
      } finally {
        session.endSession();
      }
    }
  }
};

export const verifyOtp = async (
  phoneNumber: string,
  otp: string,
): Promise<boolean> => {
  try {
    const existingOtp = await Otp.findOne({ phoneNumber });

    if (!existingOtp) {
      throw new Error('No OTP found for this phone number.');
    }

    // Check if OTP is expired
    if (new Date() > new Date(existingOtp.expiresAt)) {
      await existingOtp.deleteOne();
      throw new Error('OTP has expired. Please request a new one.');
    }

    // Hash the provided OTP and compare with the stored hash
    const hashedOtp = hashOtp(otp);
    if (existingOtp.otp !== hashedOtp) {
      throw new Error('Invalid OTP.');
    }

    // Delete OTP after successful verification
    await existingOtp.deleteOne();

    return true;
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to verify OTP. Please try again later.',
    );
  }
};
