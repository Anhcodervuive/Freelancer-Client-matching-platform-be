import { Router } from 'express'

import {
        getFreelancerDetailForClient,
        listFreelancersForClient
} from '~/controllers/client/freelancer.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/freelancers', authenticateMiddleware, errorHandler(listFreelancersForClient))
router.get('/freelancers/:freelancerId', authenticateMiddleware, errorHandler(getFreelancerDetailForClient))

export default router
