import { Router } from 'express'

import authRouter from './auth.route'
import onboardingRoute from './onboarding.route'
import profileRoute from './profile.route'
import paymentMethodRoute from './payment-method.route'
import categoryRoute from './category.route'
import categorySkillRoute from './category-skill.routes'
import specialtyRoute from './specialties.route'
import specialtySkillRoute from './specialty-skill.routes'
import skillRoute from './skill.route'

const rootRouter: Router = Router()

rootRouter.use('/auth', authRouter)
rootRouter.use('/onboarding', onboardingRoute)
rootRouter.use('/profile', profileRoute)
rootRouter.use('/payment-method', paymentMethodRoute)
rootRouter.use('/category', categoryRoute, categorySkillRoute)
rootRouter.use('/specialty', specialtyRoute, specialtySkillRoute)
rootRouter.use('/skill', skillRoute)

export default rootRouter
