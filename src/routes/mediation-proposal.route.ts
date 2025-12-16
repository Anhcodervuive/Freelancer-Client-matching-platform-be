import { Router } from 'express'
import authenticateMiddleware from '~/middlewares/authentication'
import {
	createMediationProposal,
	getMediationProposal,
	listMediationProposals,
	respondToMediationProposal,
	deleteMediationProposal,
	getMediationPaymentStatus,
	retryMediationPayment
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

// Get payment status for a mediation proposal
mediationProposalRouter.get('/:proposalId/payment-status', getMediationPaymentStatus)

// Retry payment for a mediation proposal (admin only)
mediationProposalRouter.post('/:proposalId/retry-payment', retryMediationPayment)

export default mediationProposalRouter
