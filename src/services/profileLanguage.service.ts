import { prismaClient } from '~/config/prisma-client'
import { LanguageProficiency } from '../generated/prisma'

/**
 * Thêm hoặc cập nhật 1 ngôn ngữ cho user (upsert một bản ghi).
 */
async function getAll(userId: string) {
	return prismaClient.profileLanguage.findMany({
		where: {
			userId
		}
	})
}

/**
 * Thêm hoặc cập nhật 1 ngôn ngữ cho user (upsert một bản ghi).
 */
async function addOne(userId: string, languageCode: string, proficiency: LanguageProficiency) {
	return prismaClient.profileLanguage.upsert({
		where: { userId_languageCode: { userId, languageCode } },
		update: { proficiency },
		create: { userId, languageCode, proficiency }
	})
}

/**
 * Xóa 1 ngôn ngữ khỏi profile.
 */
async function removeOne(userId: string, languageCode: string) {
	await prismaClient.profileLanguage.delete({
		where: { userId_languageCode: { userId, languageCode } }
	})
	return { success: true }
}

export default {
	getAll,
	addOne,
	removeOne
}
