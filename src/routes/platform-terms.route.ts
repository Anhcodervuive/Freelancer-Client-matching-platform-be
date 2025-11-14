import { Router } from 'express'

import {
        getLatestPlatformTerms,
        getPlatformTermsByVersion,
        listPublicPlatformTerms
} from '~/controllers/platform-terms.controller'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', errorHandler(listPublicPlatformTerms))
router.get('/latest', errorHandler(getLatestPlatformTerms))
router.get('/:version', errorHandler(getPlatformTermsByVersion))

export default router
