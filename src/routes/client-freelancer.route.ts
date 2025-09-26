import { Router } from 'express'

import {
        getFreelancerDetailForClient,
        listFreelancersForClient,
        saveFreelancerForClient,
        unsaveFreelancerForClient
} from '~/controllers/client/freelancer.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/freelancers', authenticateMiddleware, errorHandler(listFreelancersForClient))
router.get('/freelancers/:freelancerId', authenticateMiddleware, errorHandler(getFreelancerDetailForClient))
router.post('/freelancers/:freelancerId/save', authenticateMiddleware, errorHandler(saveFreelancerForClient))
router.delete('/freelancers/:freelancerId/save', authenticateMiddleware, errorHandler(unsaveFreelancerForClient))

export default router
