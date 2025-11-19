import { Router } from 'express'

import {
        approveMilestoneSubmission,
        cancelMilestone,
        createContractMilestone,
        createDisputeNegotiation,
        declineMilestoneSubmission,
        deleteContractMilestone,
        deleteMilestoneResource,
        deleteDisputeNegotiation,
        confirmArbitrationFee,
        getMilestoneDispute,
        getContractDetail,
        acceptContractTerms,
        sendContractSignatureEnvelope,
        syncContractSignatureEnvelope,
        endContract,
        listMilestoneResources,
        listContractMilestones,
        listContractDisputes,
        listContracts,
        openMilestoneDispute,
        payMilestone,
        respondDisputeNegotiation,
        updateDisputeNegotiation,
        respondMilestoneCancellation,
        listFinalEvidenceSources,
        submitFinalEvidence,
        submitMilestoneWork,
        uploadMilestoneResources,
        submitContractFeedback,
        listContractFeedbacks,
        updateContractFeedback,
        deleteContractFeedback
} from '~/controllers/contract.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { uploadAnyFiles } from '~/middlewares/multer'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listContracts))
router.get('/:contractId', authenticateMiddleware, errorHandler(getContractDetail))
router.post('/:contractId/terms/accept', authenticateMiddleware, errorHandler(acceptContractTerms))
router.post(
        '/:contractId/signatures/docusign/send',
        authenticateMiddleware,
        errorHandler(sendContractSignatureEnvelope)
)
router.post(
        '/:contractId/signatures/docusign/sync',
        authenticateMiddleware,
        errorHandler(syncContractSignatureEnvelope)
)
router.post('/:contractId/end', authenticateMiddleware, errorHandler(endContract))
router.get('/:contractId/feedback', authenticateMiddleware, errorHandler(listContractFeedbacks))
router.post('/:contractId/feedback', authenticateMiddleware, errorHandler(submitContractFeedback))
router.patch('/:contractId/feedback', authenticateMiddleware, errorHandler(updateContractFeedback))
router.delete('/:contractId/feedback', authenticateMiddleware, errorHandler(deleteContractFeedback))
router.get('/:contractId/disputes', authenticateMiddleware, errorHandler(listContractDisputes))
router.get('/:contractId/milestones', authenticateMiddleware, errorHandler(listContractMilestones))
router.get(
        '/:contractId/milestones/:milestoneId/disputes',
        authenticateMiddleware,
        errorHandler(getMilestoneDispute)
)
router.post('/:contractId/milestones', authenticateMiddleware, errorHandler(createContractMilestone))
router.delete('/:contractId/milestones/:milestoneId', authenticateMiddleware, errorHandler(deleteContractMilestone))
router.post('/:contractId/milestones/:milestoneId/cancel', authenticateMiddleware, errorHandler(cancelMilestone))
router.post(
        '/:contractId/milestones/:milestoneId/cancel/respond',
        authenticateMiddleware,
        errorHandler(respondMilestoneCancellation)
)
router.post(
        '/:contractId/milestones/:milestoneId/disputes',
        authenticateMiddleware,
        errorHandler(openMilestoneDispute)
)
router.post(
        '/:contractId/milestones/:milestoneId/disputes/:disputeId/negotiations',
        authenticateMiddleware,
        errorHandler(createDisputeNegotiation)
)
router.patch(
        '/:contractId/milestones/:milestoneId/disputes/:disputeId/negotiations/:negotiationId',
        authenticateMiddleware,
        errorHandler(updateDisputeNegotiation)
)
router.post(
        '/:contractId/milestones/:milestoneId/disputes/:disputeId/negotiations/:negotiationId/respond',
        authenticateMiddleware,
        errorHandler(respondDisputeNegotiation)
)
router.delete(
        '/:contractId/milestones/:milestoneId/disputes/:disputeId/negotiations/:negotiationId',
        authenticateMiddleware,
        errorHandler(deleteDisputeNegotiation)
)
router.post(
        '/:contractId/milestones/:milestoneId/disputes/:disputeId/arbitration-fees/confirm',
        authenticateMiddleware,
        errorHandler(confirmArbitrationFee)
)
router.get(
        '/:contractId/milestones/:milestoneId/disputes/:disputeId/final-evidence/sources',
        authenticateMiddleware,
        errorHandler(listFinalEvidenceSources)
)
router.post(
        '/:contractId/milestones/:milestoneId/disputes/:disputeId/final-evidence',
        authenticateMiddleware,
        errorHandler(submitFinalEvidence)
)
router.post(
        '/:contractId/milestones/:milestoneId/pay',
        authenticateMiddleware,
        errorHandler(payMilestone)
)
router.get(
        '/:contractId/milestones/:milestoneId/resources',
        authenticateMiddleware,
        errorHandler(listMilestoneResources)
)
router.post(
        '/:contractId/milestones/:milestoneId/resources',
        authenticateMiddleware,
        uploadAnyFiles.any(),
        errorHandler(uploadMilestoneResources)
)
router.delete(
        '/:contractId/milestones/:milestoneId/resources/:resourceId',
        authenticateMiddleware,
        errorHandler(deleteMilestoneResource)
)
router.post(
        '/:contractId/milestones/:milestoneId/submissions',
        authenticateMiddleware,
        uploadAnyFiles.any(),
        errorHandler(submitMilestoneWork)
)
router.post(
        '/:contractId/milestones/:milestoneId/submissions/:submissionId/approve',
        authenticateMiddleware,
        errorHandler(approveMilestoneSubmission)
)
router.post(
        '/:contractId/milestones/:milestoneId/submissions/:submissionId/decline',
        authenticateMiddleware,
        errorHandler(declineMilestoneSubmission)
)

export default router
