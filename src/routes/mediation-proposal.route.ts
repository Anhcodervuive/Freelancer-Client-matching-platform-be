import { Router } from 'express'
import authenticateMiddleware from '~/middlewares/authentication'
import {
	createMediationProposal,
	getMediationProposal,
	listMediationProposals,
	respondToMediationProposal,
	deleteMediationProposal
} from '~/controllers/mediation-proposal.controller'

const mediationProposalRouter = Router()

// All routes require authentication
mediationProposalRouter.use(authenticateMiddleware)

// Create mediation proposal for a dispute (admin only)
mediationProposalRouter.post('/dispute/:disputeId', createMediationProposal)

// Get mediation proposals for a dispute
mediationProposalRouter.get('/dispute/:disputeId', listMediationProposals)

// Get a specific mediation proposal
mediationProposalRouter.get('/:proposalId', getMediationProposal)

// Respond to a mediation proposal
mediationProposalRouter.put('/:proposalId/respond', respondToMediationProposal)

// Delete a mediation proposal (admin only)
mediationProposalRouter.delete('/:proposalId', deleteMediationProposal)

export default mediationProposalRouter
