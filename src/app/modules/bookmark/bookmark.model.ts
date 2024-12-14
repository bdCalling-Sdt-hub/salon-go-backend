import { model, Schema } from 'mongoose';
import { BookmarkModel, IBookmark } from './bookmark.interface';

const bookmarkSchema = new Schema<IBookmark, BookmarkModel>(
  {
    professional: {
      type: Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
  },
  { timestamps: true },
);

bookmarkSchema.index({ customer: 1 });

export const Bookmark = model<IBookmark, BookmarkModel>(
  'Bookmark',
  bookmarkSchema,
);
