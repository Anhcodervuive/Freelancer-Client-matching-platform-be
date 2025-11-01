import { Router } from 'express'

import { getClientSpendingStatistics } from '~/controllers/client/financial.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/financial/spending-statistics', authenticateMiddleware, errorHandler(getClientSpendingStatistics))

export default router
