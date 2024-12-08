import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { ServiceServices } from './service.service';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const createService = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await ServiceServices.createServiceToDB(user, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service created successfully',
    data: result,
  });
});

const updateService = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { id } = req.params;
  const result = await ServiceServices.updateServiceToDB(user, id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service updated successfully',
    data: result,
  });
});

const deleteService = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { id } = req.params;
  const result = await ServiceServices.deleteServiceFromDB(user, id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service deleted successfully',
    data: result,
  });
});

const getServicesByProfessionalId = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await ServiceServices.getServicesByProfessionalIdFromDB(id);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Services retrieved successfully',
      data: result,
    });
  },
);

export const ServiceController = {
  createService,
  updateService,
  deleteService,
  getServicesByProfessionalId,
};
