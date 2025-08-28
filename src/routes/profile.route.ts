import { Router } from 'express'
import { getMyProfile, updateMyProfile } from '~/controllers/profile.controller'
import {
	addOneProfileLanguage,
	getAllProfileLanguage,
	removeProfileLanguage
} from '~/controllers/profileLanguage.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router: Router = Router()

router.get('/profile', authenticateMiddleware, errorHandler(getMyProfile))
router.put('/profile', authenticateMiddleware, errorHandler(updateMyProfile))

router.get('/profile/:userId/language', authenticateMiddleware, errorHandler(getAllProfileLanguage))
router.put('/profile/:userId/language', authenticateMiddleware, errorHandler(addOneProfileLanguage))
router.delete('/profile/:userId/language/:code', authenticateMiddleware, errorHandler(removeProfileLanguage))

export default router
