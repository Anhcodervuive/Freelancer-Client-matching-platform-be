import { Router } from 'express'

import {
        createJobPost,
        deleteJobPost,
        getJobPostDetail,
        listJobPosts,
        updateJobPost
} from '~/controllers/job-post.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import optionalAuthentication from '~/middlewares/optional-authentication'
import { uploadAnyFiles } from '~/middlewares/multer'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', optionalAuthentication, errorHandler(listJobPosts))
router.get('/:id', optionalAuthentication, errorHandler(getJobPostDetail))
const uploadJobAttachments = uploadAnyFiles.any()

router.post('/', authenticateMiddleware, uploadJobAttachments, errorHandler(createJobPost))
router.patch('/:id', authenticateMiddleware, uploadJobAttachments, errorHandler(updateJobPost))
router.delete('/:id', authenticateMiddleware, errorHandler(deleteJobPost))

export default router
