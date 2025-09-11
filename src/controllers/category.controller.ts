import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { CreateCategorySchema, UpdateCategorySchema } from '~/schema/category.schema'
import categorySerivce from '~/services/category.serivce'
import { toSlug } from '~/utils/formatter'

export async function getCategories(req: Request, res: Response) {
	const page = Number(req.query.page) || 1
	const limit = Number(req.query.limit) || 10
	const search = String(req.query.search ?? '')

	const result = await categorySerivce.getAll(page, limit, search)

	res.status(StatusCodes.OK).json({ data: result.data, total: result.total })
}

export async function createCategory(req: Request, res: Response) {
	if (req.body?.slug) {
		req.body.slug = toSlug(req.body.slug)
	}
	const data = CreateCategorySchema.parse(req.body)

	const result = await categorySerivce.create(data)

	return res.status(StatusCodes.CREATED).json({ message: 'Category created' })
}

export async function updateCategory(req: Request, res: Response) {
	const { id } = req.params

	if (!id) {
		throw new BadRequestException('Missing id parameter', ErrorCode.PARAM_QUERY_ERROR)
	}

	// Nếu client gửi slug thì normalize
	if (req.body?.slug) req.body.slug = toSlug(String(req.body.slug))

	const data = UpdateCategorySchema.parse(req.body)

	const result = await categorySerivce.update(id, data)

	return res.status(StatusCodes.OK).json({ message: 'Category Updated' })
}

export async function deleteCategory(req: Request, res: Response) {
	const { id } = req.params

	if (!id) {
		throw new BadRequestException('Missing id parameter', ErrorCode.PARAM_QUERY_ERROR)
	}

	const result = await categorySerivce.deleteById(id)

	return res.status(StatusCodes.OK).json({ message: 'Category deleted' })
}
