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
  auth: Types.ObjectId;
  businessName: string;
  targetAudience: 'men' | 'women';
  serviceType: 'home' | 'in-place';
  travelFee: ITravelFee;
  teamSize: {
    min: number;
    max: number;
  };
  scheduleId?: Types.ObjectId;
  description: string;
  license: string;
  ID: string;
  profile: string;
  socialLinks: ISocialLink;
  rating: number;
  totalReviews: number;
  address: string;
  location: Point;
  informationCount: number;
  categories: Types.ObjectId[];
  subCategories: Types.ObjectId[];
  totalServiceProvided: number;
  previouslyUsedTools: boolean;
  portfolio: string[];
  helpingTags: string[];
};

export type ProfessionalModel = Model<IProfessional>;

export type IProfessionalFilters = {
  searchTerm?: string;

  city?: string;
  category?: string;
  subCategory?: string;
  subSubCategory?: string;
  minPrice?: number;
  maxPrice?: number;
  date: string;

  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
