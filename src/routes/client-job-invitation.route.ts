import { Router } from 'express'

import {
        deleteJobInvitation,
        getJobInvitationDetail,
        inviteFreelancerToJob,
        listJobInvitations
} from '~/controllers/client/job-invitation.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.post('/job-invitations', authenticateMiddleware, errorHandler(inviteFreelancerToJob))
router.get('/job-invitations', authenticateMiddleware, errorHandler(listJobInvitations))
router.get('/job-invitations/:invitationId', authenticateMiddleware, errorHandler(getJobInvitationDetail))
router.delete('/job-invitations/:invitationId', authenticateMiddleware, errorHandler(deleteJobInvitation))

export default router
