import { Router } from 'express'
import {
	addPaymentMethod,
	deletePaymentMethod,
	getListPaymentMethod,
	getPaymentMethodDetail,
	setDefaultPaymentMethod,
	setUpBillingIntent,
	updatePaymentMethod
} from '~/controllers/payment-method.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(getListPaymentMethod))
router.post('/setup-intent', authenticateMiddleware, errorHandler(setUpBillingIntent))
router.post('/', authenticateMiddleware, errorHandler(addPaymentMethod))
router.get('/:id', authenticateMiddleware, errorHandler(getPaymentMethodDetail))
router.put('/:id/default', authenticateMiddleware, errorHandler(setDefaultPaymentMethod))
router.put('/:id', authenticateMiddleware, errorHandler(updatePaymentMethod))
router.delete('/:id', authenticateMiddleware, errorHandler(deletePaymentMethod))

export default router
