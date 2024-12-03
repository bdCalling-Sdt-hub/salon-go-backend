import { JwtPayload } from 'jsonwebtoken';

import { IPaginationOptions } from '../../../types/pagination';

import { IProfessional, IProfessionalFilters } from './professional.interface';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Professional } from './professional.model';

const updateProfessionalProfile = async (
  user: JwtPayload,
  payload: Partial<IProfessional>,
) => {};

const getBusinessInformationForProfessional = async (
  user: JwtPayload,
  payload: Partial<IProfessional>,
) => {};

const getProfessionalProfile = async (
  user: JwtPayload,
): Promise<IProfessional | null> => {
  const result = await Professional.findOne({ auth: user.id }).populate(
    'auth',
    { name: 1, email: 1, role: 1, status: 1 },
  );
  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Requested professional profile not found',
    );
  }
  //@ts-ignore
  if (result.auth.status === 'delete') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Requested professional profile has been deleted.',
    );
  }
  return result;
};

const deleteProfessionalProfile = async (user: JwtPayload) => {};

const getAllProfessional = async (
  filters: IProfessionalFilters,
  paginationOptions: IPaginationOptions,
) => {
  const {} = filters;
};

export const ProfessionalService = {
  updateProfessionalProfile,
  getBusinessInformationForProfessional,
  getProfessionalProfile,
  deleteProfessionalProfile,
  getAllProfessional,
};
