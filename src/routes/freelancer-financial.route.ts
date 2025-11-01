import { Router } from 'express'

import { getFreelancerFinancialOverview } from '~/controllers/freelancer/financial.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/overview', authenticateMiddleware, errorHandler(getFreelancerFinancialOverview))

export default router

