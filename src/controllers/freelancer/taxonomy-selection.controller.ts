import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { AttachSkillSchema, SetCatSpecSchema, SetSkillsSchema } from '~/schema/freelancer-taxonomy-selection'
import {
	assertCategoriesExist,
	assertSpecialtiesInCategories,
	setCategoriesAndSpecialties,
	setSkills,
	getAllCategory,
	getAllSkill,
	attachOneSkill,
	detachOneSkill,
	getAllSpecialty
} from '~/services/freelancer/taxonomy-selection.service'

export const getCategory = async (req: Request, res: Response) => {
	const { id: userId } = req.params
	if (!userId) {
		throw new BadRequestException('Missing userId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const result = await getAllCategory(userId!)

	return res.status(StatusCodes.OK).json(result)
}

export const getSpecialty = async (req: Request, res: Response) => {
	const { id: userId } = req.params
	if (!userId) {
		throw new BadRequestException('Missing userId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const result = await getAllSpecialty(userId!)
	console.log(result)

	return res.status(StatusCodes.OK).json(result)
}

export const getSkill = async (req: Request, res: Response) => {
	const { id: userId } = req.params
	if (!userId) {
		throw new BadRequestException('Missing userId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const result = await getAllSkill(userId!)

	return res.status(StatusCodes.OK).json(result)
}

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

export const attachSkill = async (req: Request, res: Response) => {
	const { id: userId } = req.params
	if (!userId) {
		throw new BadRequestException('Missing userId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const { skillId } = AttachSkillSchema.parse(req.body)

	await attachOneSkill(userId, skillId)

	return res.status(StatusCodes.OK).json({ success: true })
}

export const detachSkill = async (req: Request, res: Response) => {
	const { id: userId, skillId } = req.params
	if (!userId || !skillId) {
		throw new BadRequestException('Missing userId or skillId', ErrorCode.PARAM_QUERY_ERROR)
	}

	await detachOneSkill(userId, skillId)

	return res.status(StatusCodes.OK).json({ success: true })
}
