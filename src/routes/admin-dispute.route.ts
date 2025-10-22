import { Router } from 'express'

import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'
import {
    getAdminDispute,
    joinDisputeAsAdmin,
    listAdminDisputes,
    requestArbitrationFees
} from '~/controllers/admin/dispute.controller'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listAdminDisputes))
router.get('/:disputeId', authenticateMiddleware, errorHandler(getAdminDispute))
router.post('/:disputeId/join', authenticateMiddleware, errorHandler(joinDisputeAsAdmin))
router.post(
    '/:disputeId/request-arbitration-fees',
    authenticateMiddleware,
    errorHandler(requestArbitrationFees)
)

export default router
