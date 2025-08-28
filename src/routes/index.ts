import { Router } from 'express'

import authRouter from './auth.route'
import profileRoute from './profile.route'

const rootRouter: Router = Router()

rootRouter.use('/auth', authRouter)
rootRouter.use('/me', profileRoute)

export default rootRouter
