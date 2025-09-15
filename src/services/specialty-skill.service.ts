import { prismaClient } from '~/config/prisma-client'

export async function getSpecialtySkills(
	specialtyId: string,
	{ search, status, page, limit }: { search?: string; status: 'all' | 'deleted'; page: number; limit: number }
) {
	const where: any = {
		specialtyId,
		...(search ? { skill: { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } } : {})
	}

	const [items, total] = await Promise.all([
		status === 'all'
			? prismaClient.specialtySkill.findMany({
					where,
					include: { skill: true },
					orderBy: [{ isDeleted: 'asc' }, { weight: 'desc' }, { skill: { name: 'asc' } }],
					take: limit,
					skip: (page - 1) * limit
			  })
			: prismaClient.specialtySkill.findManyWithDeleted({
					where,
					include: { skill: true },
					orderBy: [{ isDeleted: 'asc' }, { weight: 'desc' }, { skill: { name: 'asc' } }],
					take: limit,
					skip: (page - 1) * limit
			  }),
		prismaClient.specialtySkill.count({ where })
	])

	return { items, total }
}

export async function attachSpecialtySkills(
	specialtyId: string,
	items: Array<{ skillId: string; weight?: number }>,
	defaultWeight = 70
) {
	return prismaClient.$transaction(
		items.map(({ skillId, weight }) =>
			prismaClient.specialtySkill.upsert({
				where: { specialtyId_skillId: { specialtyId, skillId } },
				create: {
					specialtyId,
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

export async function patchSpecialtySkill(
	specialtyId: string,
	skillId: string,
	data: { weight?: number; isDeleted?: boolean; userId?: string | null }
) {
	const patch: any = {}
	if (typeof data.weight === 'number') patch.weight = Math.max(0, Math.min(100, data.weight))
	if (typeof data.isDeleted === 'boolean') {
		patch.isDeleted = data.isDeleted
		patch.deletedAt = data.isDeleted ? new Date() : null
		patch.deletedBy = data.isDeleted ? data.userId ?? null : null
	}
	return prismaClient.specialtySkill.update({
		where: { specialtyId_skillId: { specialtyId, skillId } },
		data: patch
	})
}

export async function softDeleteSpecialtySkill(specialtyId: string, skillId: string, userId?: string | null) {
	return prismaClient.specialtySkill.update({
		where: { specialtyId_skillId: { specialtyId, skillId } },
		data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId ?? null }
	})
}

export async function restoreSpecialtySkill(specialtyId: string, skillId: string) {
	return prismaClient.specialtySkill.update({
		where: { specialtyId_skillId: { specialtyId, skillId } },
		data: { isDeleted: false, deletedAt: null, deletedBy: null }
	})
}
