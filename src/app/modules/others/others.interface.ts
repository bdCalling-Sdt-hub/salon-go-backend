import { Model, Types } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';

export type IPrivacyPolicy = {
  content: string;
  userType: USER_ROLES.USER | USER_ROLES.PROFESSIONAL;
};

export type ITermsAndConditions = {
  content: string;
  userType: USER_ROLES.USER | USER_ROLES.PROFESSIONAL;
};

export type IFaQs = {
  content: string;
  userType: USER_ROLES.USER | USER_ROLES.PROFESSIONAL;
};

export type IAbout = {
  content: string;
  type: 'ABOUT';
};

export type IBanner = {
  title: string;
  description: string;
  link?: string;
  isActive: boolean;
  btnText: string;
  imgUrl: string;
  createdBy: Types.ObjectId;
};

export type PrivacyPolicyModel = Model<IPrivacyPolicy>;
export type TermsAndConditionsModel = Model<ITermsAndConditions>;
export type FaQsModel = Model<IFaQs>;
export type BannerModel = Model<IBanner>;
export type AboutModel = Model<IAbout>;
