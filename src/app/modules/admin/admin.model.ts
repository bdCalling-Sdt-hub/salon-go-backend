import { model, Schema } from 'mongoose'
import { AdminModel, IAdmin } from './admin.interface'

const adminSchema = new Schema<IAdmin, AdminModel>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    contact: {
      type: String,
    },
    profileImg: {
      type: String,
    },
    address: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

export const Admin = model<IAdmin, AdminModel>('Admin', adminSchema)
