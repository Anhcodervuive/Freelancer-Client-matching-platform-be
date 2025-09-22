import { Router } from 'express'
import { getProfile, updateMyProfile, uploadAvatar } from '~/controllers/profile.controller'
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
import {
	attachSkill,
	attachSkills,
	detachSkill,
	getCategory,
	getSkill,
	getSpecialty
} from '~/controllers/freelancer/taxonomy-selection.controller'

const router: Router = Router()

router.get('/:id', authenticateMiddleware, errorHandler(getProfile))
router.put('', authenticateMiddleware, errorHandler(updateMyProfile))
router.put('/upload-avatar', authenticateMiddleware, uploadImages.single('avatar'), errorHandler(uploadAvatar))

router.get('/:userId/language', authenticateMiddleware, errorHandler(getAllFreelancerLanguages))
router.put('/:userId/language', authenticateMiddleware, errorHandler(addOneFreelancerLanguage))
router.delete('/:userId/language/:code', authenticateMiddleware, errorHandler(removeOneFreelancerLanguage))

router.get('/:userId/education', authenticateMiddleware, errorHandler(getAllEducationOfFreelancer))
router.post('/:userId/education', authenticateMiddleware, errorHandler(addOneEducation))
router.put('/:userId/education/:educationId', authenticateMiddleware, errorHandler(updateOneEducation))
router.delete('/:userId/education/:educationId', authenticateMiddleware, errorHandler(deleteOneEducation))

router.get('/:userId/freelancer', authenticateMiddleware, errorHandler(getFreelancerProfile))
router.put('/:userId/freelancer', authenticateMiddleware, errorHandler(updateFreelancerProfile))

router.get('/:id/category', errorHandler(getCategory))
router.get('/:id/specialty', errorHandler(getSpecialty))

router.get('/:id/skill', errorHandler(getSkill))

router.post('/:id/skill', authenticateMiddleware, errorHandler(attachSkill))
router.delete('/:id/skill/:skillId', authenticateMiddleware, errorHandler(detachSkill))

export default router
