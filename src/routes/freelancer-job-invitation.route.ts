import { Router } from 'express'

import { respondToJobInvitation } from '~/controllers/freelancer/job-invitation.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.post('/:invitationId/respond', authenticateMiddleware, errorHandler(respondToJobInvitation))

export default router
