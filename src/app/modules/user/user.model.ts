import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { model, Schema, Types } from 'mongoose';
import config from '../../../config';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { IUser, UserModel } from './user.interface';

const userSchema = new Schema<IUser, UserModel>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    contact: {
      type: String,
      unique: true,
      required: true,
    },
    profile: {
      type: String,
    },
    password: {
      type: String,
      required: true,
      select: 0,
      minlength: 8,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'restricted', 'delete'],
      default: 'active',
    },

    appId: {
      type: String,
      select: 0,
    },

    verified: {
      type: Boolean,
      default: false,
    },
    wrongLoginAttempts: {
      type: Number,
      default: 0,
    },
    restrictionLeftAt: {
      type: Date,
      default: null,
    },
    authentication: {
      type: {
        passwordChangedAt: {
          type: Date,
        },
        isResetPassword: {
          type: Boolean,
          default: false,
        },
        oneTimeCode: {
          type: Number,
          default: null,
        },
        expireAt: {
          type: Date,
          default: null,
        },
      },
      select: 0,
    },
  },
  {
    timestamps: true,
  },
);

//exist user check
userSchema.statics.isExistUserById = async (id: string) => {
  const isExist = await User.findById({ _id: id, status: 'active' });
  return isExist;
};

userSchema.statics.isExistUserByEmail = async (email: string) => {
  const isExist = await User.findOne({ email, status: 'active' });
  return isExist;
};

//is match password
userSchema.statics.isMatchPassword = async (
  password: string,
  hashPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashPassword);
};

//check user
userSchema.pre('save', async function (next) {
  //check user
  const isExist = await User.findOne({ email: this.email });
  if (isExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exist!');
  }

  //password hash
  this.password = await bcrypt.hash(
    this.password,
    Number(config.bcrypt_salt_rounds),
  );
  next();
});

export const User = model<IUser, UserModel>('User', userSchema);
