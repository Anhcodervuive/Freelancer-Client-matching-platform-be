// src/modules/taxonomy/service.ts
import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'

export async function assertCategoriesExist(categoryIds: string[]) {
	if (!categoryIds.length) return
	const found = await prismaClient.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true } })
	if (found.length !== categoryIds.length)
		throw new BadRequestException('Some categories not found', ErrorCode.ITEM_NOT_FOUND)
}

export async function assertSpecialtiesInCategories(specialtyIds: string[], categoryIds: string[]) {
	if (!specialtyIds.length) return
	const rows = await prismaClient.specialty.findMany({
		where: { id: { in: specialtyIds } },
		select: { id: true, categoryId: true }
	})
	if (rows.length !== specialtyIds.length)
		throw new BadRequestException('Some specialties not found', ErrorCode.ITEM_NOT_FOUND)

	const invalid = rows.filter(r => !categoryIds.includes(r.categoryId))
	if (invalid.length)
		throw new BadRequestException('Some specialties are not in selected categories', ErrorCode.ITEM_NOT_FOUND)
}

export async function getActiveCategoryIds(userId: string) {
	const rows = await prismaClient.freelancerCategorySelection.findMany({
		where: { userId, isDeleted: false },
		select: { categoryId: true }
	})
	return rows.map(r => r.categoryId)
}

export async function getActiveSpecialtyIds(userId: string) {
	const rows = await prismaClient.freelancerSpecialtySelection.findMany({
		where: { userId, isDeleted: false },
		select: { specialtyId: true }
	})
	return rows.map(r => r.specialtyId)
}

export async function getAllCategoryAndSpecialty(userId: string) {
	return prismaClient.category.findMany({
		where: {
			freelancerCategorySelection: {
				every: {
					userId
				}
			}
		},
		include: {
			specialties: true
		}
	})
}

export async function getAllSkill(userId: string) {
	return prismaClient.skill.findMany({
		where: {
			freelancerSkillSelection: {
				every: {
					userId
				}
			}
		}
	})
}

/** STEP 1: soft-replace categories + specialties cùng lúc */
export async function setCategoriesAndSpecialties(userId: string, categoryIds: string[], specialtyIds: string[]) {
	const now = new Date()

	return prismaClient.$transaction(async tx => {
		// --- Categories ---
		// 1) Soft-delete những category KHÔNG còn được chọn
		await tx.freelancerCategorySelection.updateMany({
			where: { userId, isDeleted: false, categoryId: { notIn: categoryIds.length ? categoryIds : ['__none__'] } },
			data: { isDeleted: true, deletedAt: now, deletedBy: userId }
		})

		// 2) Revive những category đã từng chọn nhưng bị xóa mềm
		if (categoryIds.length) {
			await tx.freelancerCategorySelection.updateMany({
				where: { userId, isDeleted: true, categoryId: { in: categoryIds } },
				data: { isDeleted: false, deletedAt: null, deletedBy: null }
			})
		}

		// 3) Create những category còn thiếu
		if (categoryIds.length) {
			const existing = await tx.freelancerCategorySelection.findMany({
				where: { userId, categoryId: { in: categoryIds } },
				select: { categoryId: true }
			})
			const existingSet = new Set(existing.map(x => x.categoryId))
			const toCreate = categoryIds.filter(id => !existingSet.has(id))
			if (toCreate.length) {
				await tx.freelancerCategorySelection.createMany({
					data: toCreate.map(categoryId => ({ userId, categoryId }))
				})
			}
		}

		// --- Specialties ---
		// 4) Soft-delete specialties không còn nằm trong category đã chọn HOẶC không nằm trong specialtyIds mới
		await tx.freelancerSpecialtySelection.updateMany({
			where: {
				userId,
				isDeleted: false,
				OR: [
					{ specialtyId: { notIn: specialtyIds.length ? specialtyIds : ['__none__'] } },
					{ specialty: { categoryId: { notIn: categoryIds.length ? categoryIds : ['__none__'] } } }
				]
			},
			data: { isDeleted: true, deletedAt: now, deletedBy: userId }
		})

		// 5) Revive specialties (nằm trong danh sách mới & hợp lệ category)
		if (specialtyIds.length) {
			await tx.freelancerSpecialtySelection.updateMany({
				where: {
					userId,
					isDeleted: true,
					specialtyId: { in: specialtyIds },
					specialty: { categoryId: { in: categoryIds.length ? categoryIds : ['__none__'] } }
				},
				data: { isDeleted: false, deletedAt: null, deletedBy: null }
			})
		}

		// 6) Create specialties còn thiếu
		if (specialtyIds.length) {
			const existing = await tx.freelancerSpecialtySelection.findMany({
				where: { userId, specialtyId: { in: specialtyIds } },
				select: { specialtyId: true }
			})
			const existingSet = new Set(existing.map(x => x.specialtyId))
			const toCreate = specialtyIds.filter(id => !existingSet.has(id))
			if (toCreate.length) {
				await tx.freelancerSpecialtySelection.createMany({
					data: toCreate.map(specialtyId => ({ userId, specialtyId }))
				})
			}
		}

		return { success: true }
	})
}

/** STEP 2: soft-replace skills (validate theo CategorySkill hoặc SpecialtySkill) */
export async function setSkills(userId: string, skillIds: string[]) {
	const now = new Date()
	// Lấy category/specialty hiện tại (active)
	const categoryIds = await getActiveCategoryIds(userId)
	const specialtyIds = await getActiveSpecialtyIds(userId)
	if (categoryIds.length === 0) throw new Error('Select categories first')

	// Ưu tiên rule theo CategorySkill; nếu không có bảng này thì fallback theo SpecialtySkill
	const hasCategorySkill = !!(
		await prismaClient.$queryRawUnsafe<any[]>(`
    SELECT 1 FROM information_schema.tables WHERE table_name = 'CategorySkill' LIMIT 1
  `)
	).length

	if (hasCategorySkill) {
		if (skillIds.length) {
			const validPairs = await prismaClient.categorySkill.findMany({
				where: { categoryId: { in: categoryIds }, skillId: { in: skillIds } },
				select: { skillId: true }
			})
			const validSet = new Set(validPairs.map(x => x.skillId))
			const invalid = skillIds.filter(id => !validSet.has(id))
			if (invalid.length) throw new Error('Some skills are not allowed for your categories')
		}
	} else if (specialtyIds.length) {
		if (skillIds.length) {
			const rows = await prismaClient.specialtySkill.findMany({
				where: { specialtyId: { in: specialtyIds }, skillId: { in: skillIds } },
				select: { skillId: true }
			})
			const ok = new Set(rows.map(r => r.skillId))
			const invalid = skillIds.filter(id => !ok.has(id))
			if (invalid.length) throw new Error('Some skills are not allowed for your specialties')
		}
	}

	return prismaClient.$transaction(async tx => {
		// Soft-delete skills không còn chọn
		await tx.freelancerSkillSelection.updateMany({
			where: { userId, isDeleted: false, skillId: { notIn: skillIds.length ? skillIds : ['__none__'] } },
			data: { isDeleted: true, deletedAt: now, deletedBy: userId }
		})

		// Revive skills
		if (skillIds.length) {
			await tx.freelancerSkillSelection.updateMany({
				where: { userId, isDeleted: true, skillId: { in: skillIds } },
				data: { isDeleted: false, deletedAt: null, deletedBy: null }
			})
		}

		// Create skills còn thiếu
		if (skillIds.length) {
			const existing = await tx.freelancerSkillSelection.findMany({
				where: { userId, skillId: { in: skillIds } },
				select: { skillId: true }
			})
			const existingSet = new Set(existing.map(x => x.skillId))
			const toCreate = skillIds.filter(id => !existingSet.has(id))
			if (toCreate.length) {
				await tx.freelancerSkillSelection.createMany({
					data: toCreate.map(skillId => ({ userId, skillId }))
				})
			}
		}

		return { success: true }
	})
}
