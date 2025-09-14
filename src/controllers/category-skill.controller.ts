import type { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import {
	OwnerParamsSchema,
	ListOwnerSkillsQuerySchema,
	AttachByIdsBodySchema,
	AttachItemsBodySchema,
	PatchOwnerSkillParamsSchema,
	PatchOwnerSkillBodySchema,
	ListSkillsQuerySchema
} from '~/schema/skill.schema'
import {
	getCategorySkills,
	attachCategorySkills,
	patchCategorySkill,
	softDeleteCategorySkill,
	restoreCategorySkill
} from '~/services/category-skill.service'

export const getAllCategorySkills = async (req: Request, res: Response) => {
	const params = OwnerParamsSchema.parse(req.params)
	const q = ListSkillsQuerySchema.parse(req.query)
	const page = q.page ? Number(q.page) : 1
	const limit = q.limit ? Number(q.limit) : 10
	const { items, total } = await getCategorySkills(params.id, {
		search: q.search ?? '',
		page,
		limit,
		status: q.status
	})
	return res.json({ data: items, meta: { page, limit, total } })
}

export const attachCategorySkillsByIds = async (req: Request, res: Response) => {
	const params = OwnerParamsSchema.parse(req.params)
	const body = AttachByIdsBodySchema.parse(req.body)
	const items = body.skillIds.map(skillId => ({ skillId }))
	const result = await attachCategorySkills(params.id, items, body.defaultWeight ?? 50)
	return res.status(StatusCodes.CREATED).json(result)
}

export const attachCategorySkillsItems = async (req: Request, res: Response) => {
	const params = OwnerParamsSchema.parse(req.params)
	const body = AttachItemsBodySchema.parse(req.body)
	const result = await attachCategorySkills(params.id, body.items, body.defaultWeight ?? 50)
	return res.status(StatusCodes.CREATED).json(result)
}

export const patchOneCategorySkill = async (req: Request, res: Response) => {
	const userId = req.user?.id!
	const params = PatchOwnerSkillParamsSchema.parse({ ...req.params })
	const body = PatchOwnerSkillBodySchema.parse(req.body)
	const data = await patchCategorySkill(params.id, params.skillId, {
		...body,
		userId
	})
	return res.json(data)
}

export const deleteOneCategorySkill = async (req: Request, res: Response) => {
	const userId = req.user?.id!
	const params = PatchOwnerSkillParamsSchema.parse({ ...req.params })
	const data = await softDeleteCategorySkill(params.id, params.skillId, userId)
	return res.json(data)
}

export const restoreOneCategorySkill = async (req: Request, res: Response) => {
	const params = PatchOwnerSkillParamsSchema.parse({ ...req.params })
	const data = await restoreCategorySkill(params.id, params.skillId)
	return res.json(data)
}
