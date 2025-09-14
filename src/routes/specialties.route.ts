import { Router } from 'express'
import { createSpecialty, deleteSpecialty, getSpecialties, updateSpecialty } from '~/controllers/specialties.controller'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', errorHandler(getSpecialties))
router.post('/', errorHandler(createSpecialty))
router.patch('/:id', errorHandler(updateSpecialty))
router.delete('/:id', errorHandler(deleteSpecialty))

export default router
