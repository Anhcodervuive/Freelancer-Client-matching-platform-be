import { prismaClient } from '~/config/prisma-client'
import { ErrorCode } from '~/exceptions/root'
import { UnprocessableEntityException } from '~/exceptions/validation'

const getAll = async (page: number, limit: number, search: string) => {
	const where =
		search && search.trim() !== ''
			? {
					OR: [
						{ name: { contains: String(search), mode: 'insensitive' } },
						{ slug: { contains: String(search), mode: 'insensitive' } }
					]
			  }
			: {}

	const [data, total] = await Promise.all([
		prismaClient.category.findMany({
			where,
			orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
			skip: (page - 1) * limit,
			take: limit
		}),
		prismaClient.category.count({ where })
	])

	return { data, total }
}

const create = async (data: any) => {
	const isSlugExisted = await prismaClient.category.findUnique({
		where: { slug: data.slug }
	})

	if (isSlugExisted) {
		throw new UnprocessableEntityException('Slug already exists', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	// Trước khi create
	const [, result] = await prismaClient.$transaction([
		prismaClient.category.updateMany({
			where: { sortOrder: { gte: data.sortOrder } },
			data: { sortOrder: { increment: 1 } }
		}),
		prismaClient.category.create({ data: data })
	])

	return result
}

const update = async (id: string, data: any) => {
	const categoryWithSlug = await prismaClient.category.findMany({
		where: { slug: data.slug, id: { not: id } }
	})

	if (categoryWithSlug.length > 0) {
		throw new UnprocessableEntityException('Slug already exists', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	const [, result] = await prismaClient.$transaction([
		prismaClient.category.updateMany({
			where: { sortOrder: { gte: data.sortOrder } },
			data: { sortOrder: { increment: 1 } }
		}),
		prismaClient.category.update({
			where: { id },
			data
		})
	])

	return result
}

const deleteById = async (id: string) => {
	return prismaClient.category.delete({
		where: { id }
	})
}

export default {
	getAll,
	create,
	update,
	deleteById
}
