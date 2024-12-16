import { Model, Types } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';

export type IReport = {
  reporterId: Types.ObjectId;
  reportedId: Types.ObjectId;
  reason: string;
  remark: string;
  isResolved: boolean;
  resolvedBy: USER_ROLES;
};

export type ReportModel = Model<IReport>;
