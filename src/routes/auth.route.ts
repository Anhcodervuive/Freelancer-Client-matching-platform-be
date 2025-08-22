import { Router } from 'express'
import { signup, verify } from '~/controllers/auth.controller'
import { errorHandler } from '~/utils/error-handler'

const router: Router = Router()

router.post('/signup', errorHandler(signup))
router.put('/verify/:token', errorHandler(verify))

export default router
