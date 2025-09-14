import type { Request, Response } from 'express'
import {
	OwnerParamsSchema,
	ListOwnerSkillsQuerySchema,
	AttachByIdsBodySchema,
	AttachItemsBodySchema,
	PatchOwnerSkillParamsSchema,
	PatchOwnerSkillBodySchema
} from '~/schema/skill.schema'
import {
	getSpecialtySkills,
	attachSpecialtySkills,
	patchSpecialtySkill,
	softDeleteSpecialtySkill,
	restoreSpecialtySkill
} from '~/services/specialty-skill.service'

export const getAllSpecialtySkills = async (req: Request, res: Response) => {
	const params = OwnerParamsSchema.parse(req.params)
	const q = ListOwnerSkillsQuerySchema.parse(req.query)
	const page = q.page ? Number(q.page) : 1
	const limit = q.limit ? Number(q.limit) : 10
	const { items, total } = await getSpecialtySkills(params.id, {
		search: q.search ?? '',
		status: q.status,
		page,
		limit
	})
	return res.json({ data: items, meta: { page, limit, total } })
}

export const attachSpecialtySkillsByIds = async (req: Request, res: Response) => {
	const params = OwnerParamsSchema.parse(req.params)
	const body = AttachByIdsBodySchema.parse(req.body)
	const items = body.skillIds.map(skillId => ({ skillId }))
	const result = await attachSpecialtySkills(params.id, items, body.defaultWeight ?? 70)
	return res.status(201).json({ data: result })
}

export const attachSpecialtySkillsItems = async (req: Request, res: Response) => {
	const params = OwnerParamsSchema.parse(req.params)
	const body = AttachItemsBodySchema.parse(req.body)
	const result = await attachSpecialtySkills(params.id, body.items, body.defaultWeight ?? 70)
	return res.status(201).json({ data: result })
}

export const patchOneSpecialtySkill = async (req: Request, res: Response) => {
	const userId = req.user?.id!
	const params = PatchOwnerSkillParamsSchema.parse({ ...req.params })
	const body = PatchOwnerSkillBodySchema.parse(req.body)
	const data = await patchSpecialtySkill(params.id, params.skillId, {
		...body,
		userId
	})
	return res.json({ data })
}

export const deleteOneSpecialtySkill = async (req: Request, res: Response) => {
	const userId = req.user?.id!
	const params = PatchOwnerSkillParamsSchema.parse({ ...req.params })
	const data = await softDeleteSpecialtySkill(params.id, params.skillId, userId)
	return res.json({ data })
}

export const restoreOneSpecialtySkill = async (req: Request, res: Response) => {
	const params = PatchOwnerSkillParamsSchema.parse({ ...req.params })
	const data = await restoreSpecialtySkill(params.id, params.skillId)
	return res.json({ data })
}
