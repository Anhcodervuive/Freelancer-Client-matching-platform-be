import { Router } from 'express'

import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'
import {
    getAssignedDispute,
    listAssignedDisputes
} from '~/controllers/arbitrator/dispute.controller'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listAssignedDisputes))
router.get('/:disputeId', authenticateMiddleware, errorHandler(getAssignedDispute))

export default router
