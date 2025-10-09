import { Router } from 'express'

import {
        createContractMilestone,
        getContractDetail,
        listContractMilestones,
        listContracts
} from '~/controllers/contract.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listContracts))
router.get('/:contractId', authenticateMiddleware, errorHandler(getContractDetail))
router.get('/:contractId/milestones', authenticateMiddleware, errorHandler(listContractMilestones))
router.post('/:contractId/milestones', authenticateMiddleware, errorHandler(createContractMilestone))

export default router
