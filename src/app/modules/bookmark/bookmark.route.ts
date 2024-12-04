import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { BookmarkController } from './bookmark.controller';

const router = express.Router();

router.post('/', auth(USER_ROLES.USER), BookmarkController.createBookmark);
router.get('/', auth(USER_ROLES.USER), BookmarkController.getAllBookmarks);
router.delete('/:id', auth(USER_ROLES.USER), BookmarkController.removeBookmark);

export const BookMarkRoutes = router;
