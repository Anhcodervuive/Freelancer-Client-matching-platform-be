import { Router } from 'express'
import passport from 'passport'
import { logout, resendVerifyEmail, signin, signinGoogle, signup, verify } from '~/controllers/auth.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router: Router = Router()

router.post('/signup', errorHandler(signup))
router.put('/verify/:token', errorHandler(verify))

router.post('/signin', errorHandler(signin))
router.post('/logout', authenticateMiddleware, errorHandler(logout))
router.post('/resend-verify-email/:email', errorHandler(resendVerifyEmail))

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get(
	'/google/callback',
	passport.authenticate('google', { session: false, failureRedirect: '/login' }),
	errorHandler(signinGoogle)
)

export default router
