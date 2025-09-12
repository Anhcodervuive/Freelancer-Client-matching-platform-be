import { Router } from 'express'

import authRouter from './auth.route'
import profileRoute from './profile.route'
import paymentMethodRoute from './payment-method.route'
import categoryRoute from './category.route'
import specialtyRoute from './specialties.route'

const rootRouter: Router = Router()

rootRouter.use('/auth', authRouter)
rootRouter.use('/me', profileRoute)
rootRouter.use('/payment-method', paymentMethodRoute)
rootRouter.use('/category', categoryRoute)
rootRouter.use('/specialty', specialtyRoute)

export default rootRouter
