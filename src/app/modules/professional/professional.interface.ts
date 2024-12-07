import { Model, Types } from 'mongoose';

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
  business_name: string;
  target_audience: 'men' | 'women';
  services_type: 'home' | 'in-place';
  travel_fee: ITravelFee;
  isFreelancer: boolean;
  team_size: {
    min: number;
    max: number;
  };
  schedule_id?: Types.ObjectId;
  description: string;
  license: string;
  profile: string;
  social_links: ISocialLink;
  rating: number;
  address: string;
  location: Point;
  informationCount: number;
  categories: Types.ObjectId[];
  subCategories: Types.ObjectId[];
  total_reviews: number;
  total_service_provided: number;

  is_available: boolean;
  previously_used_tools: boolean;
  portfolio: string[];
  helping_tags: string[];
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
