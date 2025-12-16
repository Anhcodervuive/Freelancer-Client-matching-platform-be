import { Router } from 'express'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'
import {
	createMediationEvidenceSubmission,
	updateMediationEvidenceSubmission,
	submitMediationEvidence,
	reviewMediationEvidence,
	addMediationEvidenceComment,
	getMediationEvidenceSubmission,
	listMediationEvidenceSubmissions,
	deleteMediationEvidenceSubmission
} from '~/controllers/mediation-evidence.controller'

const router = Router()

// Evidence submission routes
router.post(
	'/disputes/:disputeId/evidence',
	authenticateMiddleware,
	errorHandler(createMediationEvidenceSubmission)
)

router.get(
	'/disputes/:disputeId/evidence',
	authenticateMiddleware,
	errorHandler(listMediationEvidenceSubmissions)
)

router.get(
	'/evidence/:submissionId',
	authenticateMiddleware,
	errorHandler(getMediationEvidenceSubmission)
)

router.put(
	'/evidence/:submissionId',
	authenticateMiddleware,
	errorHandler(updateMediationEvidenceSubmission)
)

router.post(
	'/evidence/:submissionId/submit',
	authenticateMiddleware,
	errorHandler(submitMediationEvidence)
)

router.delete(
	'/evidence/:submissionId',
	authenticateMiddleware,
	errorHandler(deleteMediationEvidenceSubmission)
)

// Admin review routes
router.post(
	'/evidence/:submissionId/review',
	authenticateMiddleware,
	errorHandler(reviewMediationEvidence)
)

// Comment routes
router.post(
	'/evidence/:submissionId/comments',
	authenticateMiddleware,
	errorHandler(addMediationEvidenceComment)
)

// Mediation proposal routes
import {
	createMediationProposal,
	respondToMediationProposal,
	getMediationProposal,
	listMediationProposals,
	deleteMediationProposal
} from '~/controllers/mediation-proposal.controller'

router.post(
	'/disputes/:disputeId/proposals',
	authenticateMiddleware,
	errorHandler(createMediationProposal)
)

router.get(
	'/disputes/:disputeId/proposals',
	authenticateMiddleware,
	errorHandler(listMediationProposals)
)

router.get(
	'/proposals/:proposalId',
	authenticateMiddleware,
	errorHandler(getMediationProposal)
)

router.post(
	'/proposals/:proposalId/respond',
	authenticateMiddleware,
	errorHandler(respondToMediationProposal)
)

router.delete(
	'/proposals/:proposalId',
	authenticateMiddleware,
	errorHandler(deleteMediationProposal)
)

export default router