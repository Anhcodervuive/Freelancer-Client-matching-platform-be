import { Router } from 'express'

import {
        getJobInvitationDetail,
        listJobInvitations,
        respondToJobInvitation
} from '~/controllers/freelancer/job-invitation.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listJobInvitations))
router.get('/:invitationId', authenticateMiddleware, errorHandler(getJobInvitationDetail))
router.post('/:invitationId/respond', authenticateMiddleware, errorHandler(respondToJobInvitation))

export default router
