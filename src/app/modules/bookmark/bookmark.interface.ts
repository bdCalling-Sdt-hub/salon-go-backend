import { Model, Types } from 'mongoose';

export type IBookmark = {
  professional: Types.ObjectId;
  customer: Types.ObjectId;
};

export type BookmarkModel = Model<IBookmark>;
