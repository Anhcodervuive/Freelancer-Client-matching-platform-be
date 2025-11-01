import { Router } from 'express'

import {
    banAdminUser,
    getAdminUserDetail,
    listAdminUsers,
    unbanAdminUser,
    updateAdminUserRole,
    updateAdminUserStatus
} from '~/controllers/admin/user.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listAdminUsers))
router.get('/:userId', authenticateMiddleware, errorHandler(getAdminUserDetail))
router.patch('/:userId/role', authenticateMiddleware, errorHandler(updateAdminUserRole))
router.patch('/:userId/status', authenticateMiddleware, errorHandler(updateAdminUserStatus))
router.post('/:userId/ban', authenticateMiddleware, errorHandler(banAdminUser))
router.post('/:userId/unban', authenticateMiddleware, errorHandler(unbanAdminUser))

export default router
