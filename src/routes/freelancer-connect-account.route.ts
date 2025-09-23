import { Router } from 'express'

import {
        createConnectAccountLink,
        createConnectAccountLoginLink,
        deleteConnectAccount,
        getConnectAccount,
} from '~/controllers/freelancer/connect-account.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

// Every handler is wrapped with the shared authentication middleware so that only
// logged-in freelancers can manage their Stripe payout configuration. The
// errorHandler helper makes sure thrown exceptions reach the global handler.
router.get('/', authenticateMiddleware, errorHandler(getConnectAccount))
router.post('/link', authenticateMiddleware, errorHandler(createConnectAccountLink))
router.post('/login-link', authenticateMiddleware, errorHandler(createConnectAccountLoginLink))
router.delete('/', authenticateMiddleware, errorHandler(deleteConnectAccount))

export default router
