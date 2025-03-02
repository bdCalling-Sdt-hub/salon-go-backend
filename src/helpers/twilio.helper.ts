import twilio from 'twilio';

import { addMinutes } from 'date-fns';
import config from '../config';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const accountSid = config.twilio.account_sid;
const authToken = config.twilio.auth_token;
const twilioPhoneNumber = config.twilio.phone_number;
const client = twilio(accountSid, authToken);
import { Otp } from '../app/modules/otp/otp.model';
import { User } from '../app/modules/user/user.model';
import mongoose, { Types } from 'mongoose';
import { Professional } from '../app/modules/professional/professional.model';
import { hashOtp } from '../utils/cryptoToken';

export const sendOtp = async (
  phoneNumber: string,
  id: Types.ObjectId,
): Promise<void> => {
  const existingOtp = await Otp.findOne({ phoneNumber });
  try {
    if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Invalid phone number format.',
      );
    }

    if (existingOtp) {
      const timeElapsed =
        Date.now() - new Date(existingOtp.lastRequestAt).getTime();
      const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds

      if (timeElapsed < tenMinutes && existingOtp.requestCount >= 3) {
        throw new Error('Too many OTP requests. Please try again later.');
      }

      if (timeElapsed >= tenMinutes) {
        existingOtp.requestCount = 1;
        existingOtp.lastRequestAt = new Date();
      } else {
        existingOtp.requestCount += 1;
      }

      await existingOtp.save();
    }

    // Generate a random 5-digit OTP
    const otp = Math.floor(100000 + Math.random() * 899999).toString();
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

    

   const twilioResponse =  await client.messages.create({
      body: `Your Salon go one time verification code is ${otp}. It will expire in 5 minutes.`,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });

    newOtp.sid = twilioResponse.sid || '';
    await newOtp.save();
   
  } catch (error) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      // Delete the user and associated professional profile
      await User.findByIdAndDelete(id, { session });
      await Professional.findOneAndDelete({ auth: id }, { session });
      await Otp.findOneAndDelete({ phoneNumber }, { session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to send OTP and user data could not be deleted. Please try again later.',
      );
    } finally {
      await session.endSession();
    }
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to send OTP. Please try again.',
    );
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
    await User.findOneAndUpdate({ contact: phoneNumber }, { $set: { authentication: { oneTimeCode: null, expireAt: null }, verified: true } });

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




export const twilioStatusCallback = async (payload: any) => {

  if (payload.Level === 'ERROR' || payload.Payload.error_code === '30008') {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const parsedData = JSON.parse(payload.Payload)
      
      // Find and delete the OTP, user, and professional in a single transaction
      const otp = await Otp.findOneAndDelete({ sid: parsedData.service_sid  }, { session });

      if (!otp) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'OTP not found.');
      }
      const user = await User.findOneAndDelete({ contact: otp.phoneNumber }, { session });

      if (user) {
        await Professional.findOneAndDelete({ auth: user._id }, { session });
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();

      if (error instanceof ApiError) {
        throw error; // Re-throw known ApiError
      }

      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to process Twilio status callback.',
      );
    } finally {
      await session.endSession();
    }
  }
};