import { prismaClient } from '~/config/prisma-client'

export async function getSkills({
	search,
	page,
	limit,
	onlyActive
}: {
	search?: string
	page: number
	limit: number
	onlyActive?: boolean
}) {
	const where = {
		...(onlyActive ? { isActive: true } : {}),
		isDeleted: false,
		...(search ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } : {})
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
