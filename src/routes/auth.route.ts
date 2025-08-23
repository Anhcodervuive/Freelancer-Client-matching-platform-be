import { Router } from 'express'
import { logout, signin, signup, verify } from '~/controllers/auth.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router: Router = Router()

router.post('/signup', errorHandler(signup))
router.put('/verify/:token', errorHandler(verify))

router.post('/signin', errorHandler(signin))
router.post('/logout', authenticateMiddleware, errorHandler(logout))

export default router
