// src/utils/embeddingText.ts
import { Prisma } from '~/generated/prisma'
import { htmlToPlainText } from './htmlToText'

/**
 * JobPost kèm các quan hệ cần thiết để build embedding
 * Nhớ query Prisma với đúng phần `include` này.
 */
export type JobPostForEmbedding = Prisma.JobPostGetPayload<{
	include: {
		specialty: {
			include: {
				category: true // Specialty có thể có field `category`
			}
		} // Specialty có ít nhất field `name` (và có thể có `category`...)
		requiredSkills: {
			include: {
				skill: true // Skill model có field `name`
			}
		}
		languages: true
	}
}>

// Type đầy đủ cho embed
export type FreelancerForEmbedding = Prisma.FreelancerGetPayload<{
	include: {
		freelancerSkillSelection: {
			include: { skill: true } // giả sử model Skill có field `name`
		}
		freelancerCategorySelection: {
			include: { category: true }
		}
		freelancerSpecialtySelection: {
			include: { specialty: true }
		}
	}
}>

export function buildFullTextForFreelancer(f: FreelancerForEmbedding): string {
	const parts: string[] = []

	if (f.title) {
		parts.push(`Title: ${f.title}`)
	}

	const overview = htmlToPlainText(f.bio) // tạm thời dùng bio vì schema ông không có overview
	console.log(f.title, overview)
	if (overview) {
		const trimmed = overview.length > 800 ? overview.slice(0, 800) + '...' : overview
		parts.push(`Overview: ${trimmed}`)
	}

	// Lấy skills từ bảng phụ freelancerSkillSelection
	const skills = f.freelancerSkillSelection?.map(s => s.skill.name) ?? []
	if (skills.length > 0) {
		parts.push(`Skills: ${skills.join(', ')}`)
	}

	// Lấy category / specialty từ bảng phụ
	const category = f.freelancerCategorySelection?.[0]?.category?.name
	const specialty = f.freelancerSpecialtySelection?.[0]?.specialty?.name

	if (category || specialty) {
		const cat = [category, specialty].filter(Boolean).join(' / ')
		parts.push(`Domain: ${cat}`)
	}

	return parts.join('\n')
}

export function buildSkillsTextForFreelancer(f: FreelancerForEmbedding): string {
	const skills = f.freelancerSkillSelection?.filter(s => !s.isDeleted).map(s => s.skill.name) ?? []
	if (!skills || skills.length === 0) return ''
	// đơn giản: chỉ list skill
	return skills.join(', ')
}

export function buildDomainTextForFreelancer(f: FreelancerForEmbedding): string {
	const parts: string[] = []
	const category = f.freelancerCategorySelection?.[0]?.category?.name
	const specialty = f.freelancerSpecialtySelection?.[0]?.specialty?.name
	if (category) parts.push(category)
	if (specialty) parts.push(specialty)
	return parts.join(' / ')
}

export function buildFullTextForJob(job: JobPostForEmbedding): string {
	const parts: string[] = []

	// 1. Title
	if (job.title) {
		parts.push(`Title: ${job.title}`)
	}

	// 2. Description (rút gọn)
	if (job.description) {
		const desc = job.description.length > 1500 ? job.description.slice(0, 1500) + '...' : job.description
		parts.push(`Description: ${desc}`)
	}

	// 3. Required skills
	const skillNames = job.requiredSkills?.map(rs => rs.skill?.name).filter(Boolean) ?? []
	if (skillNames.length > 0) {
		parts.push(`Required skills: ${skillNames.join(', ')}`)
	}

	// 4. Languages
	const languageNames = job.languages?.map(jl => jl.languageCode).filter(Boolean) ?? []
	if (languageNames.length > 0) {
		parts.push(`Languages: ${languageNames.join(', ')}`)
	}

	// 5. Specialty / Domain
	// giả sử Specialty có field `name`, và có thể có `category.name`
	let specialtyParts: string[] = []
	if (job.specialty) {
		if ((job.specialty as any).category?.name) {
			specialtyParts.push((job.specialty as any).category.name)
		}
		if (job.specialty.name) {
			specialtyParts.push(job.specialty.name)
		}
	}
	if (specialtyParts.length > 0) {
		parts.push(`Domain: ${specialtyParts.join(' / ')}`)
	}

	// 6. Experience level
	if (job.experienceLevel) {
		parts.push(`Experience level: ${job.experienceLevel}`)
	}

	// 7. Payment & budget
	const budgetPieces: string[] = []
	if (job.paymentMode) {
		budgetPieces.push(`Payment mode: ${job.paymentMode}`)
	}
	if (job.budgetAmount != null) {
		budgetPieces.push(`Budget: ${job.budgetAmount.toString()} ${job.budgetCurrency || ''}`.trim())
	}
	if (budgetPieces.length > 0) {
		parts.push(budgetPieces.join(' | '))
	}

	// 8. Duration
	if (job.duration) {
		parts.push(`Duration: ${job.duration}`)
	}

	// 9. Location Type + preferred locations (nếu muốn thêm)
	if (job.locationType) {
		parts.push(`Location type: ${job.locationType}`)
	}

	// preferredLocations là JSON, nếu ông muốn có thể bóc nhẹ
	// ví dụ dạng: [{ country: "US", city: "New York" }, ...]
	if (job.preferredLocations && Array.isArray(job.preferredLocations)) {
		const locStrings = (job.preferredLocations as any[])
			.map(loc => loc.label || loc.city || loc.country)
			.filter(Boolean)
		if (locStrings.length > 0) {
			parts.push(`Preferred locations: ${locStrings.join(', ')}`)
		}
	}

	return parts.join('\n')
}

export function buildSkillsTextForJob(job: any): string {
	const skillNames = job.skills?.required?.map((rs: { name: any }) => rs.name) ?? []

	if (skillNames.length === 0) return ''

	// Chỉ cần list skill, cho embedding SKILLS sạch và tập trung
	return skillNames.join(', ')
}

export function buildDomainTextForJob(job: JobPostForEmbedding): string {
	const parts: string[] = []

	// Specialty + Category (nếu có)
	if (job.specialty) {
		const s = job.specialty
		const maybeCategoryName = (s as any).category?.name
		if (maybeCategoryName) {
			parts.push(maybeCategoryName)
		}
		if (s.name) {
			parts.push(s.name)
		}
	}

	// Có thể thêm experienceLevel / locationType để domain rõ hơn
	// if (job.experienceLevel) {
	// 	parts.push(job.experienceLevel)
	// }
	// if (job.locationType) {
	// 	parts.push(job.locationType)
	// }

	return parts.join(' / ')
}
