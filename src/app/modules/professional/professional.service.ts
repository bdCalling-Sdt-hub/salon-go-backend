import { JwtPayload } from 'jsonwebtoken'

import { IPaginationOptions } from '../../../types/pagination'

import { IProfessional, IProfessionalFilters } from './professional.interface'

const updateProfessionalProfile = async (
  user: JwtPayload,
  payload: Partial<IProfessional>
) => {}

const getBusinessInformationForProfessional = async (
  user: JwtPayload,
  payload: Partial<IProfessional>
) => {}

const getProfessionalProfile = async (user: JwtPayload) => {}

const deleteProfessionalProfile = async (user: JwtPayload) => {}

const getAllProfessional = async (
  filters: IProfessionalFilters,
  paginationOptions: IPaginationOptions
) => {
  const {} = filters
}

export const ProfessionalService = {
  updateProfessionalProfile,
  getBusinessInformationForProfessional,
  getProfessionalProfile,
  deleteProfessionalProfile,
  getAllProfessional,
}
