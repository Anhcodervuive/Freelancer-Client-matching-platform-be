import { Request, Response } from 'express'
import { SetCatSpecSchema, SetSkillsSchema } from '~/schema/freelancer-taxonomy-selection'
import {
	assertCategoriesExist,
	assertSpecialtiesInCategories,
	setCategoriesAndSpecialties,
	setSkills
} from '~/services/freelancer/taxonomy-selection'

export const attacCategoryAndSpecialty = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { categoryIds, specialtyIds } = SetCatSpecSchema.parse(req.body)

	await assertCategoriesExist(categoryIds)
	await assertSpecialtiesInCategories(specialtyIds, categoryIds)

	await setCategoriesAndSpecialties(userId!, categoryIds, specialtyIds)
	res.json({ message: 'Categories and specialties updated successfully' })
}

export const attachSkills = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { skillIds } = SetSkillsSchema.parse(req.body)

	await setSkills(userId!, skillIds)
	res.json({ success: true })
}
