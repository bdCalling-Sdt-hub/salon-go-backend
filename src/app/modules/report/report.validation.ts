import { z } from 'zod';

const createReportZodSchema = z.object({
  body: z.object({
    reason: z.string().min(1, { message: 'Reason is required' }),
    reportedId: z.string().min(1, { message: 'Reported ID is required' }),
  }),
});

const updateReportZodSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
  }),
});

const resolveReportZodSchema = z.object({
  body: z.object({
    remark: z.string().min(1, { message: 'Remark is required' }),
  }),
});
export const ReportValidations = {
  createReportZodSchema,
  updateReportZodSchema,
  resolveReportZodSchema,
};
