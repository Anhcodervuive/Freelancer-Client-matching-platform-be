import { Router } from 'express'

import { handleDocuSignWebhook } from '~/controllers/webhook.controller'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.post('/docusign', errorHandler(handleDocuSignWebhook))

export default router
