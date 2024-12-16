import { Schema, model } from 'mongoose';
import { IReport, ReportModel } from './report.interface';
import { USER_ROLES } from '../../../enums/user';

const reportSchema = new Schema<IReport, ReportModel>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    remark: { type: String },
    isResolved: { type: Boolean, default: false },
    resolvedBy: {
      type: String,
      enum: [USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.PROFESSIONAL],
    },
  },
  {
    timestamps: true,
  },
);

export const Report = model<IReport, ReportModel>('Report', reportSchema);
