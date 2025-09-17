import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ErrorCode } from '~/exceptions/root'
import { UnprocessableEntityException } from '~/exceptions/validation'
import {
	SpecialtyBaseSchema,
	SpecialtyByCategoryIdsQuerySchema,
	SpecialtyCreateGlobal,
	SpecialtyCreateGlobalSchema,
	SpecialtyQuerySchema,
	SpecialtyUpdateSchema
} from '~/schema/specialty.schema'
import specialtieService from '~/services/specialtie.service'
import { toSlug } from '~/utils/formatter'

// Lấy danh sách specialty cho cả 2 UX
export async function getSpecialties(req: Request, res: Response) {
	const { page, limit, search, categoryId: qCat } = SpecialtyQuerySchema.parse(req.query)
	const paramCat =
		typeof req.params.categoryId === 'string' && req.params.categoryId !== '' ? req.params.categoryId : undefined
	const categoryId = paramCat ?? qCat

	const result = await specialtieService.getAll(page, limit, search, categoryId)

	return res.status(StatusCodes.OK).json({ data: result.data, total: result.total })
}

export async function getSpecialtiesByCategoryIds(req: Request, res: Response) {
	const { page, limit, search, categoryIds: qCats } = SpecialtyByCategoryIdsQuerySchema.parse(req.query)
	const result = await specialtieService.getAll(page, limit, search, qCats)

	return res.status(StatusCodes.OK).json({ data: result.data, total: result.total })
}

export async function createSpecialty(req: Request, res: Response) {
	const paramCat = typeof req.params.categoryId === 'string' ? req.params.categoryId : undefined

	// Chuẩn hóa slug
	if (req.body?.slug) req.body.slug = toSlug(String(req.body.slug))

	// Chọn schema theo bối cảnh
	const payload = paramCat
		? SpecialtyBaseSchema.parse(req.body) // UX A: categoryId từ params
		: SpecialtyCreateGlobalSchema.parse(req.body) // UX B: categoryId trong body

	const categoryId = paramCat ?? (payload as SpecialtyCreateGlobal).categoryId

	const result = await specialtieService.create(categoryId, payload)

	return res.status(StatusCodes.CREATED).json({ message: 'Specialty created' })
}

export async function updateSpecialty(req: Request, res: Response) {
	const { id } = req.params
	if (!id) {
		throw new UnprocessableEntityException('Specialty ID is required', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	if (req.body?.slug) req.body.slug = toSlug(String(req.body.slug))
	const patch = SpecialtyUpdateSchema.parse(req.body)

	const result = await specialtieService.update(id, patch)

	return res.status(StatusCodes.OK).json({ message: 'Specialty updated' })
}

export async function deleteSpecialty(req: Request, res: Response) {
	const { id } = req.params
	if (!id) {
		throw new UnprocessableEntityException('Specialty ID is required', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	const result = await specialtieService.remove(id)

	return res.status(StatusCodes.OK).json({ message: 'Specialty deleted' })
}
