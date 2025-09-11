import { Router } from 'express'
import { createCategory, deleteCategory, getCategories, updateCategory } from '~/controllers/category.controller'

const router = Router()

router.get('/', getCategories)
router.post('/', createCategory)
router.put('/:id', updateCategory)
router.delete('/:id', deleteCategory)

export default router
