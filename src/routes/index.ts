import { Router } from 'express'

import authRouter from './auth.route'
import profileRoute from './profile.route'
import paymentMethodRoute from './payment-method.route'

const rootRouter: Router = Router()

rootRouter.use('/auth', authRouter)
rootRouter.use('/me', profileRoute)
rootRouter.use('/payment-method', paymentMethodRoute)

export default rootRouter
