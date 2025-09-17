import type { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { CreateSkillSchema, ListSkillsQuerySchema, UpdateSkillSchema } from '~/schema/skill.schema'
import { createNewSkill, deleteById, getSkills, updateSkillById } from '~/services/skill.service'

export const listSkills = async (req: Request, res: Response) => {
	const q = ListSkillsQuerySchema.parse(req.query)
	const page = q.page ? Number(q.page) : 1
	const limit = q.limit ? Number(q.limit) : 10
	const categoryIdArr = (q.categoryIds ?? '')
		.split(',')
		.map(s => s.trim())
		.filter(Boolean)

	const specialtyIdArr = (q.specialtyIds ?? '')
		.split(',')
		.map(s => s.trim())
		.filter(Boolean)

	const { items, total } = await getSkills({
		...(q.search !== undefined ? { search: q.search } : {}),
		page,
		limit,
		categoryIdArr,
		specialtyIdArr
	})
	return res.json({
		data: items,
		meta: { page, limit, total }
	})
}

export const createSkill = async (req: Request, res: Response) => {
	const data = CreateSkillSchema.parse(req.body)
	const skill = await createNewSkill(data)

	return res.status(StatusCodes.CREATED).json({ message: 'Skill created' })
}

export const updateSkill = async (req: Request, res: Response) => {
	const { id } = req.params
	if (!id) {
		throw new BadRequestException('Missing skill id', ErrorCode.PARAM_QUERY_ERROR)
	}

	const data = UpdateSkillSchema.parse(req.body)
	const result = await updateSkillById(id, data)

	return res.json({ message: 'Skill updated' })
}

export const deleteSkill = async (req: Request, res: Response) => {
	const { id } = req.params
	if (!id) {
		throw new BadRequestException('Missing skill id', ErrorCode.PARAM_QUERY_ERROR)
	}
	await deleteById(id)
	return res.json({ message: 'Skill deleted' })
}
