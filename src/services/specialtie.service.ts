import { prismaClient } from '~/config/prisma-client'
import { ErrorCode } from '~/exceptions/root'
import { UnprocessableEntityException } from '~/exceptions/validation'

function buildWhere(search: string, categoryId?: string) {
	const where: any = {}
	if (categoryId) where.categoryId = categoryId
	const s = search?.trim()
	if (s) {
		where.OR = [{ name: { contains: s } }, { slug: { contains: s } }]
	}
	return where
}

const getAll = async (page: number, limit: number, search: string, categoryId?: string) => {
	const where = buildWhere(search, categoryId)
	const [data, total] = await Promise.all([
		prismaClient.specialty.findMany({
			where,
			orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
			skip: (page - 1) * limit,
			take: limit
		}),
		prismaClient.specialty.count({ where })
	])
	return {
		data,
		total
	}
}

const create = async (categoryId: string, payload: any) => {
	const created = await prismaClient.$transaction(async tx => {
		await tx.specialty.updateMany({
			where: { categoryId, sortOrder: { gte: payload.sortOrder ?? 0 } },
			data: { sortOrder: { increment: 1 } }
		})
		return tx.specialty.create({
			data: {
				categoryId,
				name: payload.name,
				slug: payload.slug,
				description: payload.description || null,
				isActive: payload.isActive ?? true,
				sortOrder: payload.sortOrder ?? 0
			}
		})
	})

	return created
}

const update = async (id: string, patch: any) => {
	const existing = await prismaClient.specialty.findUnique({ where: { id } })

	if (!existing) throw new UnprocessableEntityException('Specialty not found', ErrorCode.UNPROCESSABLE_ENTITY)
	const newCategoryId = patch.categoryId ?? existing.categoryId
	const newSort = patch.sortOrder ?? existing.sortOrder
	const sameCategory = newCategoryId === existing.categoryId

	const updated = await prismaClient.$transaction(async tx => {
		// Nếu đổi category → đóng khe ở category cũ, mở khe ở category mới
		if (!sameCategory) {
			// 1) Đẩy các item phía sau trong category cũ xuống để lấp khoảng trống
			await tx.specialty.updateMany({
				where: { categoryId: existing.categoryId, sortOrder: { gt: existing.sortOrder } },
				data: { sortOrder: { decrement: 1 } }
			})
			// 2) Mở chỗ trống ở category mới tại vị trí newSort
			await tx.specialty.updateMany({
				where: { categoryId: newCategoryId, sortOrder: { gte: newSort } },
				data: { sortOrder: { increment: 1 } }
			})
		} else if (newSort !== existing.sortOrder) {
			// Cùng category nhưng đổi vị trí
			if (newSort < existing.sortOrder) {
				// di chuyển lên: shift [newSort .. old-1] +1
				await tx.specialty.updateMany({
					where: {
						categoryId: existing.categoryId,
						sortOrder: { gte: newSort, lt: existing.sortOrder }
					},
					data: { sortOrder: { increment: 1 } }
				})
			} else {
				// di chuyển xuống: shift (old .. new] -1
				await tx.specialty.updateMany({
					where: {
						categoryId: existing.categoryId,
						sortOrder: { gt: existing.sortOrder, lte: newSort }
					},
					data: { sortOrder: { decrement: 1 } }
				})
			}
		}

		// 3) Cập nhật bản thân specialty
		return tx.specialty.update({
			where: { id },
			data: {
				categoryId: newCategoryId,
				sortOrder: newSort,
				...(patch.name !== undefined && { name: patch.name }),
				...(patch.slug !== undefined && { slug: patch.slug }),
				...(patch.description !== undefined && { description: patch.description || null }),
				...(patch.isActive !== undefined && { isActive: patch.isActive })
			}
		})
	})

	return updated
}

const remove = async (id: string) => {
	const existing = await prismaClient.specialty.findUnique({ where: { id } })

	if (!existing) throw new UnprocessableEntityException('Specialty not found', ErrorCode.UNPROCESSABLE_ENTITY)

	return prismaClient.$transaction(async tx => {
		await tx.specialty.delete({ where: { id } })
		await tx.specialty.updateMany({
			where: { categoryId: existing.categoryId, sortOrder: { gt: existing.sortOrder } },
			data: { sortOrder: { decrement: 1 } }
		})
	})
}

export default { getAll, create, update, remove }
