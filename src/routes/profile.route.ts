import { Router } from 'express'
import { getMyProfile, updateMyProfile } from '~/controllers/profile.controller'
import {
	addOneFreelancerLanguage,
	getAllFreelancerLanguages,
	removeOneFreelancerLanguage
} from '~/controllers/freelancerLanguage.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'
import {
	addOneEducation,
	deleteOneEducation,
	getAllEducationOfFreelancer,
	updateOneEducation
} from '~/controllers/freelancerEducation.controller'

const router: Router = Router()

router.get('/profile', authenticateMiddleware, errorHandler(getMyProfile))
router.put('/profile', authenticateMiddleware, errorHandler(updateMyProfile))

router.get('/profile/:userId/language', authenticateMiddleware, errorHandler(getAllFreelancerLanguages))
router.put('/profile/:userId/language', authenticateMiddleware, errorHandler(addOneFreelancerLanguage))
router.delete('/profile/:userId/language/:code', authenticateMiddleware, errorHandler(removeOneFreelancerLanguage))

router.get('/profile/:userId/education', authenticateMiddleware, errorHandler(getAllEducationOfFreelancer))
router.post('/profile/:userId/education', authenticateMiddleware, errorHandler(addOneEducation))
router.put('/profile/:userId/education/:educationId', authenticateMiddleware, errorHandler(updateOneEducation))
router.delete('/profile/:userId/education/:educationId', authenticateMiddleware, errorHandler(deleteOneEducation))

export default router
