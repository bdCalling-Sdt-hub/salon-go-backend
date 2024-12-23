import { model, Schema } from 'mongoose';
import {
  BannerModel,
  FaQsModel,
  IBanner,
  IFaQs,
  IPrivacyPolicy,
  ITermsAndConditions,
  PrivacyPolicyModel,
  TermsAndConditionsModel,
} from './others.interface';
import { USER_ROLES } from '../../../enums/user';

const privacyPolicySchema = new Schema<IPrivacyPolicy, PrivacyPolicyModel>(
  {
    content: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: [USER_ROLES.USER, USER_ROLES.PROFESSIONAL],
      required: true,
    },
  },
  { timestamps: true },
);

const termsAndConditionSchema = new Schema<
  ITermsAndConditions,
  TermsAndConditionsModel
>(
  {
    content: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: [USER_ROLES.USER, USER_ROLES.PROFESSIONAL],
      required: true,
    },
  },
  { timestamps: true },
);

const faqsSchema = new Schema<IFaQs, FaQsModel>(
  {
    content: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: [USER_ROLES.USER, USER_ROLES.PROFESSIONAL],
      required: true,
    },
  },
  { timestamps: true },
);

const bannerSchema = new Schema<IBanner, BannerModel>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    link: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    btnText: {
      type: String,
    },
    imgUrl: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true },
);

export const PrivacyPolicy = model<IPrivacyPolicy, PrivacyPolicyModel>(
  'PrivacyPolicy',
  privacyPolicySchema,
);

export const TermsAndCondition = model<
  ITermsAndConditions,
  TermsAndConditionsModel
>('TermsAndCondition', termsAndConditionSchema);

export const FaQs = model<IFaQs, FaQsModel>('FaQs', faqsSchema);

export const Banner = model<IBanner, BannerModel>('Banner', bannerSchema);
