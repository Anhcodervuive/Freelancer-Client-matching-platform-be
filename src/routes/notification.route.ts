import { Router } from 'express'

import { deleteNotification, markNotificationAsRead } from '~/controllers/notification.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.patch('/:notificationId/read', authenticateMiddleware, errorHandler(markNotificationAsRead))
router.delete('/:notificationId', authenticateMiddleware, errorHandler(deleteNotification))

export default router
