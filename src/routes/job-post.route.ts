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
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', optionalAuthentication, errorHandler(listJobPosts))
router.get('/:id', optionalAuthentication, errorHandler(getJobPostDetail))
router.post('/', authenticateMiddleware, errorHandler(createJobPost))
router.patch('/:id', authenticateMiddleware, errorHandler(updateJobPost))
router.delete('/:id', authenticateMiddleware, errorHandler(deleteJobPost))

export default router
