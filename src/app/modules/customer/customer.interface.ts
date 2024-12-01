import { Model } from 'mongoose';

export type ICustomer = {
  receivePromotionalNotification: boolean;
};

export type CustomerModel = Model<ICustomer>;
