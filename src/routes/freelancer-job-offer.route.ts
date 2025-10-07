import { Router } from 'express'

import {
        getJobOfferDetail,
        listJobOffers,
        respondToJobOffer
} from '~/controllers/freelancer/job-offer.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listJobOffers))
router.get('/:offerId', authenticateMiddleware, errorHandler(getJobOfferDetail))
router.post('/:offerId/respond', authenticateMiddleware, errorHandler(respondToJobOffer))

export default router
