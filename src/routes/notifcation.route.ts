import { Router } from 'express'
import { deleteNotification } from '~/controllers/notification.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.delete('/:notificationId', authenticateMiddleware, errorHandler(deleteNotification))

export default router
