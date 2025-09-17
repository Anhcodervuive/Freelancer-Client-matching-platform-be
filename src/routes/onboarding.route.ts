import { Router } from 'express'
import { attacCategoryAndSpecialty, attachSkills } from '~/controllers/freelancer/taxonomy-selection.controller'
import { chooseRole } from '~/controllers/onboarding.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

// Role, cat-spe, skill, title, education, Language, bio, location
router.post('/role', authenticateMiddleware, errorHandler(chooseRole))
// Ở đây sẽ gắn những item mới và xóa những item k nằm trong data gửi lên
router.post('/cat-spe', authenticateMiddleware, errorHandler(attacCategoryAndSpecialty))
router.post('/skill', authenticateMiddleware, errorHandler(attachSkills))

export default router
