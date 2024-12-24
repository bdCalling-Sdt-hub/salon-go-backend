import { model, Schema } from 'mongoose';
import { AdminModel, IAdmin } from './admin.interface';

const adminSchema = new Schema<IAdmin, AdminModel>(
  {
    auth: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    address: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const Admin = model<IAdmin, AdminModel>('Admin', adminSchema);
