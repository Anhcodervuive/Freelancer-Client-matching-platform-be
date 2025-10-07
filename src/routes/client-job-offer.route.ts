import { Router } from 'express'

import {
        createJobOffer,
        deleteJobOffer,
        getJobOfferDetail,
        listJobOffers,
        updateJobOffer
} from '~/controllers/client/job-offer.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.post('/job-offers', authenticateMiddleware, errorHandler(createJobOffer))
router.get('/job-offers', authenticateMiddleware, errorHandler(listJobOffers))
router.get('/job-offers/:offerId', authenticateMiddleware, errorHandler(getJobOfferDetail))
router.patch('/job-offers/:offerId', authenticateMiddleware, errorHandler(updateJobOffer))
router.delete('/job-offers/:offerId', authenticateMiddleware, errorHandler(deleteJobOffer))

export default router
