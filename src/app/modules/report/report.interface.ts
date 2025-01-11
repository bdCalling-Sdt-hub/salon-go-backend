import { Model, Types } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';

export type IReport = {
  _id: Types.ObjectId;
  reporterId: Types.ObjectId;
  reportedId: Types.ObjectId;
  reason: string;
  remark: string;
  isResolved: boolean;
  resolvedBy: USER_ROLES;
  createdAt: Date;
  updatedAt: Date;
};

export type ReportModel = Model<IReport>;
