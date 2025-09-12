import { Router } from 'express'
import { createSpecialty, deleteSpecialty, getSpecialties, updateSpecialty } from '~/controllers/specialties.controller'

const router = Router()

router.get('/', getSpecialties)
router.post('/', createSpecialty)
router.patch('/:id', updateSpecialty)
router.delete('/:id', deleteSpecialty)

export default router
