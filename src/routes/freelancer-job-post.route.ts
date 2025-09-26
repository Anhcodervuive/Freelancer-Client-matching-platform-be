import { Router } from 'express'

import {
        getPublicJobPostDetail,
        listPublicJobPosts,
        saveJobPost,
        unsaveJobPost
} from '~/controllers/freelancer/job-post.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import optionalAuthentication from '~/middlewares/optional-authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', optionalAuthentication, errorHandler(listPublicJobPosts))
router.get('/:id', optionalAuthentication, errorHandler(getPublicJobPostDetail))
router.post('/:id/save', authenticateMiddleware, errorHandler(saveJobPost))
router.delete('/:id/save', authenticateMiddleware, errorHandler(unsaveJobPost))

export default router
