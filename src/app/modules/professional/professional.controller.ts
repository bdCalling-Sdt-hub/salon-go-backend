/* eslint-disable @typescript-eslint/no-explicit-any */
import { paginationFields } from './../../../types/pagination';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';

import { Request, Response } from 'express';

import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { professionalFilterableFields } from './professional.constants';
import { IProfessional } from './professional.interface';
import { ProfessionalService } from './professional.service';

const updateProfessionalProfile = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const updatedData = req.body;

    if (req.files && 'image' in req.files && req.files.image[0]) {
      updatedData.profile = req.files.image[0];
    }

    const result = await ProfessionalService.updateProfessionalProfile(
      user,
      updatedData,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'profile updated successfully',
      data: result,
    });
  },
);

//portfolio

const addToPortfolio = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { portfolioData, replacedImage } = req.body;
  if (req.files && 'image' in req.files && req.files.image) {
    req.files.image.map((file: any) => {
      portfolioData.portfolio = `/images/${file.filename}`;
    });
  }

  const result = await ProfessionalService.addPortfolioImageToDB(
    user,
    portfolioData,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Portfolio updated successfully',
    data: portfolioData,
  });
});

const updatePortfolioImage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { removedImages } = req.body;
  const newImages = [] as string[];
  if (req.files && 'image' in req.files && req.files.image) {
    req.files.image.map((file: any) => {
      newImages.push(`/images/${file.filename}`);
    });
  }
  const result = await ProfessionalService.updatePortfolioImageToDB(
    user,
    newImages,
    removedImages,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Portfolio updated successfully',
    data: result,
  });
});

const getBusinessInformationForProfessional = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;

    const { ...professionalData } = req.body;

    const result =
      await ProfessionalService.getBusinessInformationForProfessional(
        user,
        professionalData,
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Business information updated successfully',
      data: result,
    });
  },
);

const getProfessionalProfile = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;

    const result = await ProfessionalService.getProfessionalProfile(user);

    sendResponse<IProfessional | null>(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'profile retrieved successfully',
      data: result,
    });
  },
);

const deleteProfessionalProfile = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const result = await ProfessionalService.deleteProfessionalProfile(user);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Profile deleted successfully',
      data: result,
    });
  },
);

const getSingleProfessional = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await ProfessionalService.getSingleProfessional(id);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Professional retrieved successfully',
      data: result,
    });
  },
);

//get all professional
const getAllProfessional = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, professionalFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await ProfessionalService.getAllProfessional(
    filters,
    paginationOptions,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All professional retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const ProfessionalController = {
  updateProfessionalProfile,
  getBusinessInformationForProfessional,
  getProfessionalProfile,
  deleteProfessionalProfile,
  getAllProfessional,
  getSingleProfessional,
  addToPortfolio,
  updatePortfolioImage,
};
