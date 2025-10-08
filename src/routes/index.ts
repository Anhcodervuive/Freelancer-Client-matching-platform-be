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
import portfolioRoute from './portfolio.route'
import freelancerConnectAccountRoute from './freelancer-connect-account.route'
import jobPostRoute from './job-post.route'
import freelancerJobPostRoute from './freelancer-job-post.route'
import clientFreelancerRoute from './client-freelancer.route'
import clientJobInvitationRoute from './client-job-invitation.route'
import clientJobProposalRoute from './client-job-proposal.route'
import clientJobOfferRoute from './client-job-offer.route'
import freelancerJobInvitationRoute from './freelancer-job-invitation.route'
import freelancerJobProposalRoute from './freelancer-job-proposal.route'
import freelancerJobOfferRoute from './freelancer-job-offer.route'
import notificationRoute from './notification.route'
import chatRoute from './chat.route'
import uploadRoute from './upload.route'
import contractRoute from './contract.route'

const rootRouter: Router = Router()

rootRouter.use('/auth', authRouter)
rootRouter.use('/onboarding', onboardingRoute)
rootRouter.use('/profile', profileRoute)
rootRouter.use('/payment-method', paymentMethodRoute)
rootRouter.use('/category', categoryRoute, categorySkillRoute)
rootRouter.use('/specialty', specialtyRoute, specialtySkillRoute)
rootRouter.use('/skill', skillRoute)
rootRouter.use('/portfolio', portfolioRoute)
rootRouter.use('/freelancer/connect-account', freelancerConnectAccountRoute)
rootRouter.use('/freelancer/job-posts', freelancerJobPostRoute)
rootRouter.use('/freelancer/job-invitations', freelancerJobInvitationRoute)
rootRouter.use('/freelancer/job-proposals', freelancerJobProposalRoute)
rootRouter.use('/freelancer/job-offers', freelancerJobOfferRoute)
rootRouter.use('/job-posts', jobPostRoute)
rootRouter.use('/client', clientFreelancerRoute)
rootRouter.use('/client', clientJobInvitationRoute)
rootRouter.use('/client', clientJobProposalRoute)
rootRouter.use('/client', clientJobOfferRoute)
rootRouter.use('/notification', notificationRoute)
rootRouter.use('/chat', chatRoute)
rootRouter.use('/upload', uploadRoute)
rootRouter.use('/contracts', contractRoute)

export default rootRouter
