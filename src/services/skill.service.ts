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
	const where: any = {
		isDeleted: false,
		...(search ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } : {})
	}

	// Nếu không có categoryIds & không có specialtyIds thì bạn có 2 cách:
	// 1) trả empty list; 2) trả toàn bộ skills (có search). Ở đây chọn trả theo search/all.
	const noFilters = categoryIdArr.length === 0 && specialtyIdArr.length === 0

	if (!noFilters) {
		// intersect: skill hợp lệ cả theo category LẪN specialty
		// (AND giữa 2 điều kiện)
		if (categoryIdArr.length && specialtyIdArr.length) {
			where.AND = [
				{ categories: { some: { categoryId: { in: categoryIdArr } } } },
				{ specialties: { some: { specialtyId: { in: specialtyIdArr } } } }
			]
		} else if (categoryIdArr.length === 0) {
			// skill nằm trong ÍT NHẤT MỘT category đã chọn
			where.categories = { some: { categoryId: { in: categoryIdArr } } }

			// Nếu không có categoryIds nhưng có specialtyIds (và mode=category do auto)
			if (categoryIdArr.length === 0 && specialtyIdArr.length > 0) {
				where.specialties = { some: { specialtyId: { in: specialtyIdArr } } }
			}
		} else if (specialtyIdArr.length === 0) {
			// skill nằm trong ÍT NHẤT MỘT specialty đã chọn
			where.specialties = { some: { specialtyId: { in: specialtyIdArr } } }
		}
	}

	const [items, total] = await Promise.all([
		prismaClient.skill.findMany({
			where: {
				categories: {}
			},
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
