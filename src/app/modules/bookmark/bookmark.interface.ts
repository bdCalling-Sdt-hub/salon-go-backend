import { Model, Types } from 'mongoose';

export type IBookmark = {
  _id: Types.ObjectId;
  professional: Types.ObjectId;
  customer: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type BookmarkModel = Model<IBookmark>;
