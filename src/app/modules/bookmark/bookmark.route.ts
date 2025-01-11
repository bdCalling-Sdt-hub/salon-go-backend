import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { BookmarkController } from './bookmark.controller';
import validateRequest from '../../middlewares/validateRequest';
import { BookmarkValidation } from './bookmark.validation';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.USER),
  validateRequest(BookmarkValidation.addOrRemoveBookMarkZodSchema),
  BookmarkController.createOrRemoveBookmark,
);
router.get('/', auth(USER_ROLES.USER), BookmarkController.getAllBookmarks);

export const BookMarkRoutes = router;
