import { prismaClient } from '~/config/prisma-client'

export async function getCategorySkills(
	categoryId: string,
	{ search, page, status, limit }: { search?: string; status: 'all' | 'deleted'; page: number; limit: number }
) {
	const where: any = {
		categoryId,
		...(search ? { skill: { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } } : {})
	}

	const [items, total] = await Promise.all([
		status === 'all'
			? prismaClient.categorySkill.findMany({
					where,
					include: { skill: true },
					orderBy: [{ isDeleted: 'asc' }, { weight: 'desc' }, { skill: { name: 'asc' } }],
					take: limit,
					skip: (page - 1) * limit
			  })
			: prismaClient.categorySkill.findManyWithDeleted({
					where,
					include: { skill: true },
					orderBy: [{ isDeleted: 'asc' }, { weight: 'desc' }, { skill: { name: 'asc' } }],
					take: limit,
					skip: (page - 1) * limit
			  }),
		prismaClient.categorySkill.count({ where })
	])

	return { items, total }
}

export async function attachCategorySkills(
	categoryId: string,
	items: Array<{ skillId: string; weight?: number }>,
	defaultWeight = 50
) {
	return prismaClient.$transaction(
		items.map(({ skillId, weight }) =>
			prismaClient.categorySkill.upsert({
				where: { categoryId_skillId: { categoryId, skillId } },
				create: {
					categoryId,
					skillId,
					weight: typeof weight === 'number' ? weight : defaultWeight,
					isDeleted: false,
					deletedAt: null,
					deletedBy: null
				},
				update: {
					isDeleted: false,
					deletedAt: null,
					deletedBy: null,
					...(typeof weight === 'number' ? { weight } : { weight: defaultWeight })
				}
			})
		)
	)
}

export async function patchCategorySkill(
	categoryId: string,
	skillId: string,
	data: { weight?: number; isDeleted?: boolean; userId?: string | null }
) {
	const patch: any = {}
	if (typeof data.weight === 'number') {
		patch.weight = Math.max(0, Math.min(100, data.weight))
	}
	if (typeof data.isDeleted === 'boolean') {
		patch.isDeleted = data.isDeleted
		patch.deletedAt = data.isDeleted ? new Date() : null
		patch.deletedBy = data.isDeleted ? data.userId ?? null : null
	}
	return prismaClient.categorySkill.update({
		where: { categoryId_skillId: { categoryId, skillId } },
		data: patch
	})
}

export async function softDeleteCategorySkill(categoryId: string, skillId: string, userId?: string | null) {
	return prismaClient.categorySkill.update({
		where: { categoryId_skillId: { categoryId, skillId } },
		data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId ?? null }
	})
}

export async function restoreCategorySkill(categoryId: string, skillId: string) {
	return prismaClient.categorySkill.update({
		where: { categoryId_skillId: { categoryId, skillId } },
		data: { isDeleted: false, deletedAt: null, deletedBy: null }
	})
}
