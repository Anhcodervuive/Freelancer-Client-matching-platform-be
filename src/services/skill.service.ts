import { prismaClient } from '~/config/prisma-client'

export async function getSkills({
	search,
	page,
	limit,
	categoryIdArr,
	specialtyIdArr
}: {
	search?: string
	page: number
	limit: number
	categoryIdArr: string[]
	specialtyIdArr: string[]
}) {
	let filteredCategoryIds = [...categoryIdArr]

	if (categoryIdArr.length && specialtyIdArr.length) {
		const specialties = await prismaClient.specialty.findMany({
			where: {
				id: { in: specialtyIdArr },
				isDeleted: false
			},
			select: {
				categoryId: true
			}
		})

		if (specialties.length) {
			const categoryIdsOfSpecialties = new Set(specialties.map(item => item.categoryId))
			filteredCategoryIds = filteredCategoryIds.filter(categoryId => !categoryIdsOfSpecialties.has(categoryId))
		}
	}

	const where: any = {
		isDeleted: false,
		...(search ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } : {})
	}

	const filters: any[] = []

	if (filteredCategoryIds.length) {
		filters.push({
			categories: {
				some: {
					categoryId: { in: filteredCategoryIds },
					isDeleted: false
				}
			}
		})
	}

	if (specialtyIdArr.length) {
		filters.push({
			specialties: {
				some: {
					specialtyId: { in: specialtyIdArr },
					isDeleted: false
				}
			}
		})
	}

	if (filters.length) {
		where.AND = filters
	}

	const [items, total] = await Promise.all([
		prismaClient.skill.findMany({
			where,
			orderBy: [{ name: 'asc' }],
			take: limit,
			skip: (page - 1) * limit,
			select: { id: true, name: true, slug: true, isActive: true, description: true }
		}),
		prismaClient.skill.count({ where })
	])

	return { items, total }
}

export async function createNewSkill(data: any) {
	return prismaClient.skill.create({ data })
}

export async function updateSkillById(id: string, data: any) {
	return prismaClient.skill.update({
		where: { id },
		data
	})
}

export async function deleteById(id: string) {
	return prismaClient.skill.delete({
		where: { id }
	})
}
