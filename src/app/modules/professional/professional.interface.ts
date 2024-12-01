import { Model } from 'mongoose';

type Point = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

type IAddress = {
  street: string;
  apartmentOrSuite: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type IBusinessType =
  | 'Party Rentals'
  | 'Event Planning'
  | 'Catering'
  | 'Entertainment'
  | 'Other';

type ISocialLink = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
};

export type IProfessional = {
  rating?: number;
  totalReviews: number;
  location: Point; // [longitude, latitude]

  orderCompleted?: number;
  isAvailable?: boolean; // order < 10 ? true : false

  //business information

  businessTitle?: string;
  businessType?: IBusinessType;
  businessAddress?: IAddress;
  businessContact?: string;
  businessEmail?: string;
  socialLinks: ISocialLink;
  yearsInBusiness?: number;
  servicesOffered?: string[];
  isLicensed?: boolean;
  license?: string;
  description?: string;

  availableDays?: string[];
  operationStartTime?: string;
  operationEndTime?: string;

  //bank information
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankAccountType?: string;
  bankRoutingNumber?: string;

  signatureType?: 'Typed' | 'Digital';
  signature?: string;
};

export type ProfessionalModel = Model<IProfessional>;

export type IProfessionalFilters = {
  searchTerm?: string;
  id?: string;
  name?: string;
  businessTitle?: string;
  address?: string;
  email?: string;
  minRating?: number;
  maxRating?: number;
  totalReviews?: number;
  orderCompleted?: number;
  isAvailable?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  minOrderCompleted?: number;
  maxOrderCompleted?: number;
  minReviews?: number;
  maxReviews?: number;

  // schedule
  serviceDate?: string;
  serviceTime?: string;

  //budget
  minBudget?: number;
  maxBudget?: number;

  //distance
  radius?: number;
  customerLat?: number;
  customerLng?: number;
};
