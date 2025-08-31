import { Router } from 'express'
import { getMyProfile, updateMyProfile, uploadAvatar } from '~/controllers/profile.controller'
import {
	addOneFreelancerLanguage,
	getAllFreelancerLanguages,
	removeOneFreelancerLanguage
} from '~/controllers/freelancer/language.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'
import {
	addOneEducation,
	deleteOneEducation,
	getAllEducationOfFreelancer,
	updateOneEducation
} from '~/controllers/freelancer/education.controller'
import { getFreelancerProfile, updateFreelancerProfile } from '~/controllers/freelancer/root.controller'
import { uploadImages } from '~/middlewares/multer'

const router: Router = Router()

router.get('/profile', authenticateMiddleware, errorHandler(getMyProfile))
router.put('/profile', authenticateMiddleware, errorHandler(updateMyProfile))
router.put('/profile/upload-avatar', authenticateMiddleware, uploadImages.single('avatar'), errorHandler(uploadAvatar))

router.get('/profile/:userId/language', authenticateMiddleware, errorHandler(getAllFreelancerLanguages))
router.put('/profile/:userId/language', authenticateMiddleware, errorHandler(addOneFreelancerLanguage))
router.delete('/profile/:userId/language/:code', authenticateMiddleware, errorHandler(removeOneFreelancerLanguage))

router.get('/profile/:userId/education', authenticateMiddleware, errorHandler(getAllEducationOfFreelancer))
router.post('/profile/:userId/education', authenticateMiddleware, errorHandler(addOneEducation))
router.put('/profile/:userId/education/:educationId', authenticateMiddleware, errorHandler(updateOneEducation))
router.delete('/profile/:userId/education/:educationId', authenticateMiddleware, errorHandler(deleteOneEducation))

router.get('/profile/:userId/freelancer', authenticateMiddleware, errorHandler(getFreelancerProfile))
router.put('/profile/:userId/freelancer', authenticateMiddleware, errorHandler(updateFreelancerProfile))

export default router
