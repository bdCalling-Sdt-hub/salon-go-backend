import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { BookmarkController } from './bookmark.controller';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/:id',
  auth(USER_ROLES.USER),
  BookmarkController.createOrRemoveBookmark,
);
router.get('/', auth(USER_ROLES.USER), BookmarkController.getAllBookmarks);

export const BookMarkRoutes = router;
