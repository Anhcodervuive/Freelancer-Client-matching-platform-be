import { Router } from 'express'
import { getCloudinarySign, getR2Sign } from '~/controllers/upload.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { uploadLimiter } from '~/middlewares/rateLimiter'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.use(uploadLimiter)
router.post('/cloudinary/sign', authenticateMiddleware, errorHandler(getCloudinarySign))
router.post('/r2/presign', authenticateMiddleware, errorHandler(getR2Sign))

export default router
