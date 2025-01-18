import { Model, Types } from 'mongoose';

type Point = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

type ISocialLink = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
};

type ITravelFee = {
  fee: number;
  distance: number;
};

export type IProfessional = {
  _id: Types.ObjectId;
  auth: Types.ObjectId;
  businessName?: string;
  targetAudience?: 'men' | 'woman';
  serviceType?: 'home' | 'in-place';
  travelFee?: ITravelFee;
  teamSize?: {
    min: number;
    max: number;
  };
  isFreelancer?: boolean;
  scheduleId?: Types.ObjectId;
  description?: string;
  license?: string;
  ID?: string;
  KBIS?: string;
  experience?: string;
  socialLinks?: ISocialLink;
  rating?: number;
  totalReviews?: number;
  address?: string;
  location?: Point;
  categories?: Types.ObjectId[];
  subCategories?: Types.ObjectId[];
  totalServiceProvided?: number;
  previouslyUsedTools?: boolean;
  portfolio?: [{ path: string; link?: string }];
  helpingTags?: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type ProfessionalModel = Model<IProfessional>;

export type IProfessionalFilters = {
  searchTerm?: string;
  offers?: boolean;
  city?: string;
  category?: string;
  subCategory?: string;
  subSubCategory?: string;
  minPrice?: number;
  maxPrice?: number;
  date?: string;

  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type IEnrichProfessional = {};
