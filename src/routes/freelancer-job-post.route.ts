import { Router } from 'express'

import { getPublicJobPostDetail, listPublicJobPosts } from '~/controllers/freelancer/job-post.controller'
import optionalAuthentication from '~/middlewares/optional-authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', optionalAuthentication, errorHandler(listPublicJobPosts))
router.get('/:id', optionalAuthentication, errorHandler(getPublicJobPostDetail))

export default router
