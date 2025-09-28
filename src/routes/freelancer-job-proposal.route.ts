import { Router } from 'express'

import {
        createJobProposal,
        getJobProposalDetail,
        listJobProposals,
        updateJobProposal,
        withdrawJobProposal
} from '~/controllers/freelancer/job-proposal.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listJobProposals))
router.get('/:proposalId', authenticateMiddleware, errorHandler(getJobProposalDetail))
router.post('/', authenticateMiddleware, errorHandler(createJobProposal))
router.patch('/:proposalId', authenticateMiddleware, errorHandler(updateJobProposal))
router.delete('/:proposalId', authenticateMiddleware, errorHandler(withdrawJobProposal))

export default router
