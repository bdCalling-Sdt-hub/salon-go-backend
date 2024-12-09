import { Schema, model } from 'mongoose';
import { IInvitation, InvitationModel } from './invitation.interface';

const invitationSchema = new Schema<IInvitation, InvitationModel>(
  {
    users: [{ type: Schema.Types.ObjectId, ref: 'Customer', required: true }],
    sender: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
  },
  {
    timestamps: true,
  },
);

invitationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 * 24 * 7 });

export const Invitation = model<IInvitation, InvitationModel>(
  'Invitation',
  invitationSchema,
);
