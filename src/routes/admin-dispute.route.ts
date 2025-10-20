import { Router } from 'express'

import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'
import { joinDisputeAsAdmin, listAdminDisputes } from '~/controllers/admin/dispute.controller'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listAdminDisputes))
router.post('/:disputeId/join', authenticateMiddleware, errorHandler(joinDisputeAsAdmin))

export default router
