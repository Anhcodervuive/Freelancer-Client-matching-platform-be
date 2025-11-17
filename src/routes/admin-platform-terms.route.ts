import { Router } from 'express'

import {
        createPlatformTerms,
        getPlatformTermsDetail,
        listPlatformTerms,
        updatePlatformTerms
} from '~/controllers/admin/platform-terms.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', authenticateMiddleware, errorHandler(listPlatformTerms))
router.get('/:termsId', authenticateMiddleware, errorHandler(getPlatformTermsDetail))
router.post('/', authenticateMiddleware, errorHandler(createPlatformTerms))
router.patch('/:termsId', authenticateMiddleware, errorHandler(updatePlatformTerms))

export default router
