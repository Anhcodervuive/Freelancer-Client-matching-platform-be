import { Router } from 'express'

import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'
import {
    getAdminDispute,
    joinDisputeAsAdmin,
    listAdminDisputes,
    requestArbitrationFees,
    lockDisputeForArbitration,
    generateArbitrationDossier,
    listArbitrators,
    assignArbitratorToDispute,
    listDisputeDossiers
} from '~/controllers/admin/dispute.controller'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listAdminDisputes))
router.get('/arbitrators', authenticateMiddleware, errorHandler(listArbitrators))
router.get('/:disputeId', authenticateMiddleware, errorHandler(getAdminDispute))
router.get('/:disputeId/dossiers', authenticateMiddleware, errorHandler(listDisputeDossiers))
router.post('/:disputeId/join', authenticateMiddleware, errorHandler(joinDisputeAsAdmin))
router.post(
    '/:disputeId/request-arbitration-fees',
    authenticateMiddleware,
    errorHandler(requestArbitrationFees)
)
router.post('/:disputeId/lock', authenticateMiddleware, errorHandler(lockDisputeForArbitration))
router.post('/:disputeId/dossiers', authenticateMiddleware, errorHandler(generateArbitrationDossier))
router.post('/:disputeId/arbitrator', authenticateMiddleware, errorHandler(assignArbitratorToDispute))

export default router
