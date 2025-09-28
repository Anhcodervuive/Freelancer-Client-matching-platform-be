import { Router } from 'express'

import { listJobProposalsForJob } from '~/controllers/client/job-proposal.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/job-posts/:jobId/proposals', authenticateMiddleware, errorHandler(listJobProposalsForJob))

export default router
