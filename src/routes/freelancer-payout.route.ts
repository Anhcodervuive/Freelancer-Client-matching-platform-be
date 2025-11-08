import { Router } from 'express'

import {
        createFreelancerPayout,
        getFreelancerPayoutSnapshot
} from '~/controllers/freelancer/payout.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(getFreelancerPayoutSnapshot))
router.post('/', authenticateMiddleware, errorHandler(createFreelancerPayout))

export default router
