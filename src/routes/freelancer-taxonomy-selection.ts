import { Router } from 'express'
import { attacCategoryAndSpecialty, attachSkills } from '~/controllers/freelancer/taxonomy-selection.controller'
import authenticateMiddleware from '~/middlewares/authentication'

const router = Router()

router.post('/cat-spe', authenticateMiddleware, attacCategoryAndSpecialty)

router.post('/skills', authenticateMiddleware, attachSkills)

export default router
