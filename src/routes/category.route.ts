import { Router } from 'express'
import {
	createCategory,
	deleteCategory,
	getCategories,
	getCategoryDetail,
	updateCategory
} from '~/controllers/category.controller'
import { getSpecialties } from '~/controllers/specialties.controller'

const router = Router()

router.get('/', getCategories)
router.get('/:id', getCategoryDetail)
router.post('/', createCategory)
router.put('/:id', updateCategory)
router.delete('/:id', deleteCategory)

// UX A: Nested theo Category (dùng cùng controller; controller tự lấy categoryId từ params)
router.get('/:categoryId/specialty', getSpecialties)

export default router
