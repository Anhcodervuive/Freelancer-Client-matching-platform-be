import { prismaClient } from '~/config/prisma-client'
import { LanguageProficiency } from '~/generated/prisma'

/**
 * Lấy tất cả ngôn ngữ của freelancer.
 */
async function getAll(freelancerId: string) {
	return prismaClient.freelancerLanguage.findMany({
		where: { freelancerId }
	})
}

/**
 * Thêm hoặc cập nhật 1 ngôn ngữ cho freelancer.
 */
async function addOne(freelancerId: string, languageCode: string, proficiency: LanguageProficiency) {
	return prismaClient.freelancerLanguage.upsert({
		where: { freelancerId_languageCode: { freelancerId, languageCode } },
		update: { proficiency },
		create: { freelancerId, languageCode, proficiency }
	})
}

/**
 * Xóa 1 ngôn ngữ khỏi freelancer.
 */
async function removeOne(freelancerId: string, languageCode: string) {
	await prismaClient.freelancerLanguage.delete({
		where: { freelancerId_languageCode: { freelancerId, languageCode } }
	})
	return { success: true }
}

export default {
	getAll,
	addOne,
	removeOne
}
