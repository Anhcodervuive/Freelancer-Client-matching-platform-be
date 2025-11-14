import { Router } from 'express'

import {
        getLatestPlatformTerms,
        getPlatformTermsByVersion
} from '~/controllers/platform-terms.controller'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/latest', errorHandler(getLatestPlatformTerms))
router.get('/:version', errorHandler(getPlatformTermsByVersion))

export default router
