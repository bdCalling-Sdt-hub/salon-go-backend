import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { OthersService } from './others.service';
import {
  IBanner,
  IFaQs,
  IPrivacyPolicy,
  ITermsAndConditions,
} from './others.interface';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const addBanner = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user;

  if (req.files && 'image' in req.files && req.files.image[0]) {
    payload.imgUrl = `/images/${req.files.image[0].path}`;
  }

  const result = await OthersService.addBanner(payload, user);
  sendResponse<IBanner | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Banner added successfully',
    data: result,
  });
});

const getBanners = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await OthersService.getBanners(user);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Banner retrieved successfully',
    data: result,
  });
});

const getSingleBanner = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await OthersService.getSingleBanner(id);
  sendResponse<IBanner | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Banner retrieved successfully',
    data: result,
  });
});

const updateBanner = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    payload.imgUrl = `/images/${req.files.image[0].filename}`;
  }

  const result = await OthersService.updateBanner(id, payload);
  sendResponse<IBanner | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Banner updated successfully',
    data: result,
  });
});

const createPrivacyPolicy = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await OthersService.createPrivacyPolicy(payload);
  sendResponse<IPrivacyPolicy | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Privacy policy created successfully',
    data: result,
  });
});

const createTermsAndConditions = catchAsync(
  async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await OthersService.createTermsAndConditions(payload);
    sendResponse<ITermsAndConditions | null>(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Terms and conditions created successfully',
      data: result,
    });
  },
);

const createFaQs = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await OthersService.createFaQs(payload);
  sendResponse<IFaQs | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'FaQs created successfully',
    data: result,
  });
});

const getPrivacyPolicy = catchAsync(async (req: Request, res: Response) => {
  const { type } = req.params;
  const result = await OthersService.getPrivacyPolicy(type);
  sendResponse<IPrivacyPolicy | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Privacy policy retrieved successfully',
    data: result,
  });
});

const getTermsAndConditions = catchAsync(
  async (req: Request, res: Response) => {
    const { type } = req.params;
    const result = await OthersService.getTermsAndConditions(type);
    sendResponse<ITermsAndConditions | null>(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Terms and conditions retrieved successfully',
      data: result,
    });
  },
);

const getFaQs = catchAsync(async (req: Request, res: Response) => {
  const { type } = req.params;
  const result = await OthersService.getFaQs(type);
  sendResponse<IFaQs | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'FaQs retrieved successfully',
    data: result,
  });
});

const deletePrivacyPolicy = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await OthersService.deletePrivacyPolicy(id);
  sendResponse<IPrivacyPolicy | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Privacy policy deleted successfully',
    data: result,
  });
});

const deleteTermsAndConditions = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await OthersService.deleteTermsAndConditions(id);
    sendResponse<ITermsAndConditions | null>(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Terms and conditions deleted successfully',
      data: result,
    });
  },
);

const deleteFaQs = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await OthersService.deleteFaQs(id);
  sendResponse<IFaQs | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'FaQs deleted successfully',
    data: result,
  });
});

const deleteBanner = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await OthersService.deleteBanner(id);
  sendResponse<IBanner | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Banner deleted successfully',
    data: result,
  });
});

export const OthersController = {
  createPrivacyPolicy,
  createTermsAndConditions,
  createFaQs,
  getPrivacyPolicy,
  getTermsAndConditions,
  getFaQs,
  deletePrivacyPolicy,
  deleteTermsAndConditions,
  deleteFaQs,
  addBanner,
  getBanners,
  updateBanner,
  getSingleBanner,
  deleteBanner,
};
