import { model, Schema } from 'mongoose';
import { AdminModel, IAdmin } from './admin.interface';

const adminSchema = new Schema<IAdmin, AdminModel>(
  {
    auth: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    profile: {
      type: String,
      default: 'https://cdn-icons-png.flaticon.com/512/1253/1253756.png',
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
