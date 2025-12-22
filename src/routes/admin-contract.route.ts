import { Router } from 'express'

import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'
import {
	listContracts,
	getContractDetail,
	getContractStats,
	getContractPaymentDetails
} from '~/controllers/admin/contract.controller'

const router = Router()

// GET /admin/contracts/stats - Get contract statistics
router.get('/stats', authenticateMiddleware, errorHandler(getContractStats))

// GET /admin/contracts - List all contracts with filters
router.get('/', authenticateMiddleware, errorHandler(listContracts))

// GET /admin/contracts/:contractId - Get contract detail
router.get('/:contractId', authenticateMiddleware, errorHandler(getContractDetail))

// GET /admin/contracts/:contractId/payments - Get contract payment details
router.get('/:contractId/payments', authenticateMiddleware, errorHandler(getContractPaymentDetails))

export default router
