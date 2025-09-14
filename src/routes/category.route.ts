import { Router } from 'express'
import {
	createCategory,
	deleteCategory,
	getCategories,
	getCategoryDetail,
	updateCategory
} from '~/controllers/category.controller'
import { getSpecialties } from '~/controllers/specialties.controller'
import { errorHandler } from '~/utils/error-handler'

const router = Router()

router.get('/', errorHandler(getCategories))
router.get('/:id', errorHandler(getCategoryDetail))
router.post('/', errorHandler(createCategory))
router.put('/:id', errorHandler(updateCategory))
router.delete('/:id', errorHandler(deleteCategory))

// UX A: Nested theo Category (dùng cùng controller; controller tự lấy categoryId từ params)
router.get('/:categoryId/specialty', errorHandler(getSpecialties))

export default router
