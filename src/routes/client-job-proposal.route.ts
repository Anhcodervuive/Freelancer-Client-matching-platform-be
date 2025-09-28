import { Router } from 'express'

import {
        acceptJobProposalInterview,
        declineJobProposal,
        hireFreelancerFromProposal,
        listJobProposalsForJob
} from '~/controllers/client/job-proposal.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/job-posts/:jobId/proposals', authenticateMiddleware, errorHandler(listJobProposalsForJob))
router.post(
        '/job-posts/:jobId/proposals/:proposalId/interview',
        authenticateMiddleware,
        errorHandler(acceptJobProposalInterview)
)
router.post(
        '/job-posts/:jobId/proposals/:proposalId/decline',
        authenticateMiddleware,
        errorHandler(declineJobProposal)
)
router.post(
        '/job-posts/:jobId/proposals/:proposalId/hire',
        authenticateMiddleware,
        errorHandler(hireFreelancerFromProposal)
)

export default router
