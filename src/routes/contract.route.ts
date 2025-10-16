import { Router } from 'express'

import {
        approveMilestoneSubmission,
        cancelMilestone,
        createContractMilestone,
        declineMilestoneSubmission,
        deleteContractMilestone,
        deleteMilestoneResource,
        getContractDetail,
        listMilestoneResources,
        listContractMilestones,
        listContracts,
        openMilestoneDispute,
        payMilestone,
        respondMilestoneCancellation,
        submitMilestoneWork,
        uploadMilestoneResources
} from '~/controllers/contract.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { uploadAnyFiles } from '~/middlewares/multer'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listContracts))
router.get('/:contractId', authenticateMiddleware, errorHandler(getContractDetail))
router.get('/:contractId/milestones', authenticateMiddleware, errorHandler(listContractMilestones))
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
