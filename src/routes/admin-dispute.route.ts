import { Router } from 'express'

import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'
import {
    getAdminDispute,
    joinDisputeAsAdmin,
    listAdminDisputes,
    requestArbitrationFees,
    lockDisputeForArbitration,
    generateArbitrationDossier
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
router.post('/:disputeId/lock', authenticateMiddleware, errorHandler(lockDisputeForArbitration))
router.post('/:disputeId/dossiers', authenticateMiddleware, errorHandler(generateArbitrationDossier))

export default router
