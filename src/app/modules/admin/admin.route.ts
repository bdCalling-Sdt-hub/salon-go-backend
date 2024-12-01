import express from 'express'
import auth from '../../middlewares/auth'
import { USER_ROLES } from '../../../enums/user'
import { AdminController } from './admin.controller'

const router = express.Router()

router.get('/profile', auth(USER_ROLES.ADMIN), AdminController.getAdminProfile)
router.delete('/delete', auth(USER_ROLES.ADMIN), AdminController.deleteAdmin)

export const AdminRoutes = router
