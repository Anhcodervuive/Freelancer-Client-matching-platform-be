import { Router } from 'express'

import {
        getAdminJobPostDetail,
        listAdminJobPostActivities,
        listAdminJobPosts,
        removeAdminJobPostAttachment,
        updateAdminJobPostStatus
} from '~/controllers/admin/job-post.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listAdminJobPosts))
router.get('/:jobId', authenticateMiddleware, errorHandler(getAdminJobPostDetail))
router.patch('/:jobId/status', authenticateMiddleware, errorHandler(updateAdminJobPostStatus))
router.delete(
        '/:jobId/attachments/:attachmentId',
        authenticateMiddleware,
        errorHandler(removeAdminJobPostAttachment)
)
router.get('/:jobId/activity', authenticateMiddleware, errorHandler(listAdminJobPostActivities))

export default router
