import { Router } from 'express'

import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'
import {
	listContracts,
	getContractDetail,
	getContractStats
} from '~/controllers/admin/contract.controller'

const router = Router()

// GET /admin/contracts/stats - Get contract statistics
router.get('/stats', authenticateMiddleware, errorHandler(getContractStats))

// GET /admin/contracts - List all contracts with filters
router.get('/', authenticateMiddleware, errorHandler(listContracts))

// GET /admin/contracts/:contractId - Get contract detail
router.get('/:contractId', authenticateMiddleware, errorHandler(getContractDetail))

export default router
