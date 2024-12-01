import { Schema, model } from 'mongoose';
import { IAuth, AuthModel } from './auth.interface'; 

const authSchema = new Schema<IAuth, AuthModel>({
  // Define schema fields here
});

export const Auth = model<IAuth, AuthModel>('Auth', authSchema);
