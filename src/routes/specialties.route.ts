import { Router } from 'express'
import {
	createSpecialty,
	deleteSpecialty,
	getSpecialties,
	getSpecialtiesByCategoryIds,
	updateSpecialty
} from '~/controllers/specialties.controller'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', errorHandler(getSpecialties))
router.get('/categories/', errorHandler(getSpecialtiesByCategoryIds))
router.post('/', errorHandler(createSpecialty))
router.patch('/:id', errorHandler(updateSpecialty))
router.delete('/:id', errorHandler(deleteSpecialty))

export default router
