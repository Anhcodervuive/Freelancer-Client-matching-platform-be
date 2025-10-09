import { Router } from 'express'

import {
        createContractMilestone,
        deleteMilestoneResource,
        getContractDetail,
        listMilestoneResources,
        listContractMilestones,
        listContracts,
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

export default router
