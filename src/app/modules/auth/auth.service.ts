import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import {
  IAuthResetPassword,
  IChangePassword,
  ILoginData,
  IPhoneVerify,
  IVerifyEmailOrPhone,
} from '../../../types/auth';

import generateOTP from '../../../utils/generateOtp';

import { User } from '../user/user.model';
import { ILoginResponse, IRefreshTokenResponse } from '../../../types/response';
import { ResetToken } from '../resetToken/resetToken.model';
import cryptoToken from '../../../utils/cryptoToken';
import { USER_ROLES } from '../../../enums/user';
import { Admin } from '../admin/admin.model';
import { Professional } from '../professional/professional.model';
import { Customer } from '../customer/customer.model';
import { IUser } from '../user/user.interface';
import { Reservation } from '../reservation/reservation.model';
import { verifyOtp } from '../../../helpers/twilio.helper';
import getNextOnboardingStep from '../professional/professional.utils';
import twilio from 'twilio';
import { createTokens } from './auth.utils';
import mongoose, { Types } from 'mongoose';

const accountSid = config.twilio.account_sid;
const authToken = config.twilio.auth_token;
const twilioPhoneNumber = config.twilio.phone_number;
const client = twilio(accountSid, authToken);
//login
const loginUserFromDB = async (
  payload: ILoginData,
): Promise<ILoginResponse> => {
  const { email, password, deviceId } = payload;

  const isExistUser = await User.findOne({
    email,
    status: { $in: ['active', 'restricted'] },
  }).select('+password +deviceId');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (isExistUser.status === 'restricted') {
    if (
      isExistUser.restrictionLeftAt &&
      new Date() < isExistUser.restrictionLeftAt
    ) {
      const remainingMinutes = Math.ceil(
        (isExistUser.restrictionLeftAt.getTime() - Date.now()) / 60000,
      );
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `You are restricted to login for ${remainingMinutes} minutes`,
      );
    }

    await User.findByIdAndUpdate(
      { _id: isExistUser._id },
      {
        $set: {
          status: 'active',
          wrongLoginAttempts: 0,
          restrictionLeftAt: null,
        },
      },
    );
  }

  let user;
  if (isExistUser.role === USER_ROLES.ADMIN) {
    user = await Admin.findOne({ auth: isExistUser._id });
  } else if (isExistUser.role === USER_ROLES.PROFESSIONAL) {
    user = await Professional.findOne({ auth: isExistUser._id });
  } else {
    user = await Customer.findOne({ auth: isExistUser._id });
  }

  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User details is not found!');
  }

  //create a new password hash


  // Check verified and status
  if (!isExistUser.verified) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please verify your account, then try to login again',
    );
  }

  if (isExistUser.status === 'delete') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You don’t have permission to access this content. It looks like your account has been deactivated.',
    );
  }

  // Match the password
  if (
    password &&
    !(await User.isMatchPassword(password, isExistUser.password))
  ) {
    if (isExistUser.wrongLoginAttempts >= 5) {
      isExistUser.status = 'restricted';
      isExistUser.restrictionLeftAt = new Date(Date.now() + 10 * 60 * 1000); // Restrict for 1 day
    }

    await User.findByIdAndUpdate(
      { _id: isExistUser._id },
      {
        $set: {
          wrongLoginAttempts: isExistUser.wrongLoginAttempts + 1,
          status: isExistUser.status,
          restrictionLeftAt: isExistUser.restrictionLeftAt,
        },
      },
    );
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect.');
  }

  //update device id
  await User.findByIdAndUpdate(
    { _id: isExistUser._id },
    {
      $set: {
        deviceId: deviceId || isExistUser.deviceId,
      },
    },
  );

  const accessToken = jwtHelper.createToken(
    {
      id: isExistUser._id,
      userId: user._id,
      role: isExistUser.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );
  const refreshToken = jwtHelper.createToken(
    {
      id: isExistUser._id,
      userId: user._id,
      role: isExistUser.role,
    },
    config.jwt.jwt_refresh_secret as Secret,
    config.jwt.jwt_refresh_expire_in as string,
  );

  //get information status

  if (
    isExistUser.role === USER_ROLES.PROFESSIONAL &&
    user &&
    user instanceof Professional
  ) {
    const nextStep = getNextOnboardingStep(user);
    return { accessToken, refreshToken, role: isExistUser.role, nextStep };
  }

  return { accessToken, refreshToken, role: isExistUser.role };
};

const refreshToken = async (
  token: string,
): Promise<IRefreshTokenResponse | null> => {
  let verifiedToken = null;

  try {
    // Verify the refresh token
    verifiedToken = jwtHelper.verifyToken(
      token,
      config.jwt.jwt_refresh_secret as Secret,
    );



  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh Token has expired');
    }
    throw new ApiError(StatusCodes.FORBIDDEN, 'Invalid Refresh Token');
  }

  const { email } = verifiedToken;

  let isUserExist;

  if (verifiedToken.role === USER_ROLES.ADMIN) {
    isUserExist = await Admin.findById(verifiedToken.userId).populate<{
      auth: IUser;
    }>({ path: 'auth', select: { role: 1 } });
  } else if (verifiedToken.role === USER_ROLES.PROFESSIONAL) {
    isUserExist = await Professional.findById(verifiedToken.userId).populate<{
      auth: IUser;
    }>({ path: 'auth', select: { role: 1 } });
  } else {
    isUserExist = await Customer.findById(verifiedToken.userId).populate<{
      auth: IUser;
    }>({ path: 'auth', select: { role: 1 } });
  }

  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }
  const { role } = isUserExist.auth;
  const newAccessToken = jwtHelper.createToken(
    {
      id: isUserExist.auth._id,
      userId: isUserExist._id,
      role: role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  return {
    accessToken: newAccessToken,
  };
};

const verifyPhoneToDB = async (payload: IPhoneVerify) => {
  const { contact, oneTimeCode } = payload;
  const isExistUser = await User.findOne(
    { contact },
    { role: 1, _id: 1, contact: 1, verified: 1 },
  ).select('+authentication');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (!oneTimeCode) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please provide the OTP sent to your phone.',
    );
  }

  const isValidOtp = await verifyOtp(contact, oneTimeCode.toString());
  if (!isValidOtp) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid or expired OTP.');
  }
  if (isValidOtp) {
    const updatedUser = await User.findByIdAndUpdate(
      isExistUser._id,
      {
        $set: {
          verified: true,
          authentication: { oneTimeCode: null, expireAt: null },
        },
      },
      { new: true }, // Add this to return updated document
    );
  }

  let roleUser;
  if (isExistUser.role === USER_ROLES.ADMIN) {
    roleUser = await Admin.findOne({ auth: isExistUser._id }, { _id: 1 });
  } else if (isExistUser.role === USER_ROLES.PROFESSIONAL) {
    roleUser = await Professional.findOne(
      { auth: isExistUser._id },
      { _id: 1 },
    );
  } else {
    roleUser = await Customer.findOne({ auth: isExistUser._id }, { _id: 1 });
  }

  if (!roleUser) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to get role-based user.',
    );
  }

  // Create accessToken
  const accessToken = jwtHelper.createToken(
    {
      id: isExistUser._id,
      userId: roleUser._id,
      contact: isExistUser.contact,
      role: isExistUser.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  return { accessToken, message: 'Account verification is successful.' };
};

//forget password
const verifyEmailOrPhoneToDB = async (payload: IVerifyEmailOrPhone) => {
  const { email, contact, oneTimeCode } = payload;

  if (!oneTimeCode) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Please provide the otp that was sent to your ${
        contact ? 'phone' : 'email'
      }.`,
    );
  }
  const isExistUser = await User.findOne(
    { $or: [{ email: email }, { contact: contact }] },
    { vendor: 1, role: 1, _id: 1, email: 1, verified: 1 },
  ).select('+authentication');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (isExistUser.authentication?.oneTimeCode !== oneTimeCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You provided wrong otp');
  }

  const date = new Date();
  if (
    !isExistUser.authentication?.expireAt ||
    date > isExistUser.authentication.expireAt
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Otp already expired, Please try again',
    );
  }

  await User.findOneAndUpdate(
    { _id: isExistUser._id },
    {
      authentication: {
        isResetPassword: true,
        oneTimeCode: null,
        expireAt: null,
      },
    },
  );

  //create token ;
  const createToken = cryptoToken();

  await ResetToken.create({
    user: isExistUser._id,
    token: createToken,
    expireAt: new Date(Date.now() + 5 * 60000),
  });
  const message =
    'Verification Successful: Please securely store and utilize this code for reset password';
  const data = createToken;

  return { data, message };
};

//forget password
const forgetPasswordToDB = async (email?: string, contact?: string) => {

  const isExistUser = await User.findOne({ $or: [{ email: email }, { contact: contact }] });
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `No user found with this ${email ? 'email' : 'contact'}`);
  }
  const otp = generateOTP();

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    isResetPassword: true,
    expireAt: new Date(Date.now() + 5 * 60000),
  };

  if (email) {
    const emailValue = {
      otp,
      email: isExistUser.email,
    };

    //send mail
    const forgetPassword = emailTemplate.resetPassword(emailValue);
    emailHelper.sendEmail(forgetPassword);

    await User.findOneAndUpdate({ email }, { $set: { authentication } });
  } else {
    await client.messages.create({
      body: `You have requested to reset your password. Your Salon go one time verification code is ${otp}. It will expire in 5 minutes.`,
      from: twilioPhoneNumber,
      to: isExistUser.contact,
    });
    await User.findOneAndUpdate({ contact }, { $set: { authentication } });
  }
};

//forget password
const resetPasswordToDB = async (
  token: string,
  payload: IAuthResetPassword,
) => {
  const { newPassword, confirmPassword } = payload;
  //isExist token

  const isExistToken = await ResetToken.isExistToken(token.split(' ')[1]);

  if (!isExistToken) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You are not authorized');
  }

  //user permission check
  const isExistUser = await User.findById(isExistToken.user).select(
    '+authentication',
  );

  if (!isExistUser?.authentication?.isResetPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You don't have permission to change the password. Please click again to 'Forgot Password'",
    );
  }

  // Validity check
  const isValid = await ResetToken.isExpireToken(token.split(' ')[1]);

  if (!isValid) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Token expired, Please click again to the forget password',
    );
  }

  //check password
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "New password and Confirm password doesn't match!",
    );
  }

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const updateData = {
    password: hashPassword,
    authentication: {
      isResetPassword: false,
    },
  };

  const result = await User.findOneAndUpdate(
    { _id: isExistToken.user },
    updateData,
    {
      new: true,
    },
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to reset password');
  }
};

const changePasswordToDB = async (
  user: JwtPayload,
  payload: IChangePassword,
) => {
  const { currentPassword, newPassword, confirmPassword } = payload;
  const isExistUser = await User.findById(user.id).select('+password');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //current password match
  if (
    currentPassword &&
    !(await User.isMatchPassword(currentPassword, isExistUser.password))
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
  }

  //newPassword and current password
  if (currentPassword === newPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please give different password from current password',
    );
  }
  //new password and confirm password check
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Password and Confirm password doesn't matched",
    );
  }

  //hash password
  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const updateData = {
    password: hashPassword,
  };
  await User.findOneAndUpdate({ _id: user.id }, updateData, { new: true });
};

const deleteAccount = async (user: JwtPayload, password: string) => {
  const isUserExist = await User.findById(user.id, '+password');
  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const isPasswordMatched = await User.isMatchPassword(
    password,
    isUserExist.password,
  );

  if (!isPasswordMatched) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
  }

  if (isUserExist.role === USER_ROLES.PROFESSIONAL) {
    // Check for running orders
    const professional = await Professional.findOne({ auth: isUserExist._id });
    if (!professional) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Professional doesn't exist!",
      );
    }
    const hasRunningOrder = await Reservation.exists({
      professional: professional._id,
      status: { $in: ['ongoing', 'accepted', 'confirmed'] },
    });

    if (hasRunningOrder) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You have ongoing reservation. Please complete them before deleting your profile.',
      );
    }
  }

  if (isUserExist.status === 'delete') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User already deleted!');
  }

  await User.findByIdAndUpdate(
    { _id: user.id },
    { $set: { status: 'delete' } },
  );

  return isUserExist;
};


const socialLogin = async (appId: string,deviceId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const isUserExist = await User.findOne({ appid: appId, status: { $in: ['active', 'restricted'] } , role: USER_ROLES.USER}).select('+appId +deviceId').session(session);
    const isCustomerExist = await Customer.findOne({auth: isUserExist?._id }).session(session);
    if (isUserExist) {
      const tokens = createTokens(isUserExist._id, isCustomerExist?._id as Types.ObjectId);
      await session.commitTransaction();
      return tokens;
    } else {
      
      const newUser = await User.create([{ appid: appId, role: USER_ROLES.USER, password:"hello-world!", deviceId: deviceId }], { session });
      const newCustomer = await Customer.create([{ auth: newUser[0]._id }], { session });
      
      if (!newUser || !newCustomer) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'User or Customer creation failed');
      }

      const tokens = createTokens(newUser[0]._id, newCustomer[0].id);
      await session.commitTransaction();
      return tokens;
    }
  } catch (error) {
    await session.abortTransaction();
  
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Social login failed');
  } finally {
   await session.endSession();
  }
};



const verifyTheUserAfterOtp = async (contact: string) => {

  const result = await User.findOneAndUpdate(
    { contact:contact },
    { $set: { verified: true } },
    { new: true },
  );

  if(!result){
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found!');
  }

  let accessToken = "";
  if(result.role === USER_ROLES.PROFESSIONAL){

    const professional = await Professional.findOne({ auth: result._id });
    if(!professional){
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Professional not found!');
    }
    accessToken = jwtHelper.createToken(
      {
        id: result._id,
        userId: professional._id,
        contact: result.contact,
        role: result.role,
      },
      config.jwt.jwt_secret as Secret,
      config.jwt.jwt_expire_in as string,
    );
  
  }

  return { accessToken, message: 'Account verification is successful.' };
};


const deleteUserIfFailureOccurred = async (id:Types.ObjectId) => {

 
  const session = await mongoose.startSession();
  session.startTransaction();

  const isUserExist = await User.findById(id).session(session);
  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found');
  }

  if(isUserExist.verified){
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Verified user cannot be deleted');
  }

  try {

    const result = await User.findByIdAndDelete(id, { session });
    if (!result) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Delete user failed');
    }

    if(result.role === USER_ROLES.PROFESSIONAL) {
      const professionalDeleteResult = await Professional.findOneAndDelete({auth:isUserExist._id}, { session });
      if (!professionalDeleteResult) {  
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Delete user failed');
      }
    }

    if(result.role === USER_ROLES.USER) {
      const customerDeleteResult = await Customer.findOneAndDelete({auth:isUserExist._id}, { session });
      if (!customerDeleteResult) {  
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Delete user failed');
      }
    }

    return `User with id ${id} deleted successfully`;
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Delete user failed');
  } finally {
    await session.endSession();
  }
};



export const AuthService = {
  verifyEmailOrPhoneToDB,
  loginUserFromDB,
  forgetPasswordToDB,
  changePasswordToDB,
  refreshToken,
  verifyPhoneToDB,
  resetPasswordToDB,
  deleteAccount,
  socialLogin,
  verifyTheUserAfterOtp,
  deleteUserIfFailureOccurred
};
