import { JobStatus, JobVisibility, Prisma, Role } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { FreelancerJobPostFilterInput } from '~/schema/job-post.schema'

const publicJobDetailInclude = Prisma.validator<Prisma.JobPostInclude>()({
	specialty: {
		include: {
			category: {
				select: { id: true, name: true }
			}
		}
	},
	languages: true,
	requiredSkills: {
		include: { skill: { select: { id: true, name: true, slug: true } } }
	},
	screeningQuestions: true,
	attachments: {
		include: {
			assetLink: {
				select: {
					position: true,
					isPrimary: true,
					label: true,
					caption: true,
					asset: {
						select: {
							id: true,
							kind: true,
							url: true,
							mimeType: true,
							bytes: true
						}
					}
				}
			}
		}
	},
	client: {
		select: {
			companyName: true,
			profile: {
				select: {
					firstName: true,
					lastName: true,
					country: true,
					city: true
				}
			}
		}
	}
})

const publicJobSummaryInclude = Prisma.validator<Prisma.JobPostInclude>()({
	specialty: {
		include: {
			category: {
				select: { id: true, name: true }
			}
		}
	},
	languages: true,
	requiredSkills: {
		include: { skill: { select: { id: true, name: true, slug: true } } }
	},
	client: {
		select: {
			companyName: true,
			profile: {
				select: {
					firstName: true,
					lastName: true,
					country: true,
					city: true
				}
			}
		}
	},
	_count: {
		select: { attachments: true }
	}
})

type PublicJobDetailPayload = Prisma.JobPostGetPayload<{ include: typeof publicJobDetailInclude }>
type PublicJobSummaryPayload = Prisma.JobPostGetPayload<{ include: typeof publicJobSummaryInclude }>

type JobSkillRelation = Pick<PublicJobDetailPayload['requiredSkills'][number], 'isPreferred' | 'orderHint'> & {
	skill: Pick<PublicJobDetailPayload['requiredSkills'][number]['skill'], 'id' | 'name' | 'slug'>
}

type ActivityEntry = {
	jobId: string
	actorId: string | null
	actorRole: Role | null
	action: string
	metadata?: Prisma.InputJsonValue
}

const uniquePreserveOrder = <T>(items: readonly T[]): T[] => {
	const seen = new Set<T>()
	const result: T[] = []
	for (const item of items) {
		if (seen.has(item)) continue
		seen.add(item)
		result.push(item)
	}
	return result
}

const mapSkills = (relations: readonly JobSkillRelation[]) => {
	const required: { id: string; name: string; slug: string; orderHint: number | null }[] = []
	const preferred: { id: string; name: string; slug: string; orderHint: number | null }[] = []

	const sorted = [...relations].sort((a, b) => {
		if (a.isPreferred !== b.isPreferred) {
			return a.isPreferred ? 1 : -1
		}
		const hintA = a.orderHint ?? Number.MAX_SAFE_INTEGER
		const hintB = b.orderHint ?? Number.MAX_SAFE_INTEGER
		if (hintA !== hintB) return hintA - hintB
		return 0
	})

	for (const relation of sorted) {
		const view = {
			id: relation.skill.id,
			name: relation.skill.name,
			slug: relation.skill.slug,
			orderHint: relation.orderHint ?? null
		}

		if (relation.isPreferred) {
			preferred.push(view)
		} else {
			required.push(view)
		}
	}

	return { required, preferred }
}

const sanitizeClientSummary = (client: PublicJobSummaryPayload['client'] | PublicJobDetailPayload['client']) => {
	if (!client) return null
	const profile = client.profile
	const firstName = profile?.firstName ?? null
	const lastNameInitial = profile?.lastName ? `${profile.lastName[0]}.` : null
	const displayName = firstName ? `${firstName}${lastNameInitial ? ` ${lastNameInitial}` : ''}` : null

	return {
		companyName: client.companyName ?? null,
		displayName,
		location: {
			country: profile?.country ?? null,
			city: profile?.city ?? null
		}
	}
}

const normalizePreferredLocations = (value: Prisma.JsonValue | null): unknown[] => {
	if (!value) return []
	if (Array.isArray(value)) return value as unknown[]
	return []
}

const serializeJobSummary = (job: PublicJobSummaryPayload) => {
	const skills = mapSkills(job.requiredSkills as readonly JobSkillRelation[])
	return {
		id: job.id,
		title: job.title,
		description: job.description,
		paymentMode: job.paymentMode,
		budgetAmount: job.budgetAmount ? Number(job.budgetAmount) : null,
		budgetCurrency: job.budgetCurrency ?? null,
		duration: job.duration ?? null,
		experienceLevel: job.experienceLevel,
		locationType: job.locationType,
		preferredLocations: normalizePreferredLocations(job.preferredLocations),
		publishedAt: job.publishedAt ?? null,
		createdAt: job.createdAt,
		updatedAt: job.updatedAt,
		specialty: {
			id: job.specialty.id,
			name: job.specialty.name,
			category: {
				id: job.specialty.category.id,
				name: job.specialty.category.name
			}
		},
		languages: job.languages.map(language => ({
			languageCode: language.languageCode,
			proficiency: language.proficiency
		})),
		skills,
		client: sanitizeClientSummary(job.client),
		proposalsCount: job.proposalsCount,
		attachmentsCount: job._count.attachments
	}
}

const serializeJobDetail = (job: PublicJobDetailPayload) => {
	const skills = mapSkills(job.requiredSkills)
	const attachments = job.attachments
		.map(attachment => ({
			id: attachment.id,
			assetLinkId: attachment.assetLinkId,
			label: attachment.assetLink.label ?? null,
			caption: attachment.assetLink.caption ?? null,
			isPrimary: attachment.assetLink.isPrimary,
			position: attachment.assetLink.position,
			asset: {
				id: attachment.assetLink.asset.id,
				kind: attachment.assetLink.asset.kind,
				url: attachment.assetLink.asset.url ?? null,
				mimeType: attachment.assetLink.asset.mimeType ?? null,
				bytes: attachment.assetLink.asset.bytes ?? null
			},
			createdAt: attachment.createdAt,
			updatedAt: attachment.updatedAt
		}))
		.sort((a, b) => a.position - b.position)

	return {
		id: job.id,
		title: job.title,
		description: job.description,
		paymentMode: job.paymentMode,
		budgetAmount: job.budgetAmount ? Number(job.budgetAmount) : null,
		budgetCurrency: job.budgetCurrency ?? null,
		duration: job.duration ?? null,
		experienceLevel: job.experienceLevel,
		locationType: job.locationType,
		preferredLocations: normalizePreferredLocations(job.preferredLocations),
		publishedAt: job.publishedAt ?? null,
		createdAt: job.createdAt,
		updatedAt: job.updatedAt,
		specialty: {
			id: job.specialty.id,
			name: job.specialty.name,
			category: {
				id: job.specialty.category.id,
				name: job.specialty.category.name
			}
		},
		languages: job.languages.map(language => ({
			languageCode: language.languageCode,
			proficiency: language.proficiency
		})),
		skills,
		screeningQuestions: [...job.screeningQuestions]
			.sort((a, b) => {
				if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex
				return a.createdAt.getTime() - b.createdAt.getTime()
			})
			.map(question => ({
				id: question.id,
				question: question.question,
				isRequired: question.isRequired,
				orderIndex: question.orderIndex
			})),
		attachments,
		client: sanitizeClientSummary(job.client)
	}
}

const recordJobActivities = async (entries: readonly ActivityEntry[]) => {
	if (entries.length === 0) return
	await prismaClient.jobActivityLog.createMany({
		data: entries.map(entry => ({
			jobId: entry.jobId,
			actorId: entry.actorId,
			actorRole: entry.actorRole,
			action: entry.action,
			...(entry.metadata !== undefined ? { metadata: entry.metadata } : {})
		}))
	})
}

const buildPublicJobWhere = (filters: FreelancerJobPostFilterInput): Prisma.JobPostWhereInput => {
	const where: Prisma.JobPostWhereInput = {
		status: JobStatus.PUBLISHED,
		visibility: JobVisibility.PUBLIC,
		isDeleted: false
	}

	if (filters.search) {
		where.OR = [{ title: { contains: filters.search } }, { description: { contains: filters.search } }]
	}

	if (filters.specialtyId) {
		where.specialtyId = filters.specialtyId
	}

	if (filters.categoryId) {
		where.specialty = { categoryId: filters.categoryId }
	}

	const andConditions: Prisma.JobPostWhereInput[] = []

	if (filters.paymentModes && filters.paymentModes.length > 0) {
		where.paymentMode = filters.paymentModes.length === 1 ? filters.paymentModes[0]! : { in: filters.paymentModes }
	}

	if (filters.formVersions && filters.formVersions.length > 0) {
		where.formVersion = filters.formVersions.length === 1 ? filters.formVersions[0]! : { in: filters.formVersions }
	}

	if (filters.experienceLevels && filters.experienceLevels.length > 0) {
		where.experienceLevel =
			filters.experienceLevels.length === 1 ? filters.experienceLevels[0]! : { in: filters.experienceLevels }
	}

	if (filters.locationTypes && filters.locationTypes.length > 0) {
		where.locationType = filters.locationTypes.length === 1 ? filters.locationTypes[0]! : { in: filters.locationTypes }
	}

	if (filters.languageCodes && filters.languageCodes.length > 0) {
		for (const code of filters.languageCodes) {
			andConditions.push({ languages: { some: { languageCode: code } } })
		}
	}

	if (filters.skillIds && filters.skillIds.length > 0) {
		for (const skillId of filters.skillIds) {
			andConditions.push({ requiredSkills: { some: { skillId } } })
		}
	}

	if (filters.hasAttachments === true) {
		andConditions.push({ attachments: { some: {} } })
	} else if (filters.hasAttachments === false) {
		andConditions.push({ attachments: { none: {} } })
	}

	if (filters.budgetMin !== undefined || filters.budgetMax !== undefined) {
		where.budgetAmount = {
			...(filters.budgetMin !== undefined ? { gte: filters.budgetMin } : {}),
			...(filters.budgetMax !== undefined ? { lte: filters.budgetMax } : {})
		}
		andConditions.push({ budgetAmount: { not: null } })
	}

	if (filters.createdFrom || filters.createdTo) {
		where.createdAt = {
			...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
			...(filters.createdTo ? { lte: filters.createdTo } : {})
		}
	}

	if (andConditions.length > 0) {
		where.AND = andConditions
	}

	return where
}

const listJobPosts = async (filters: FreelancerJobPostFilterInput, viewerId?: string) => {
	const page = filters.page
	const limit = filters.limit
	const sortBy = filters.sortBy ?? 'newest'

	if (filters.budgetMin !== undefined && filters.budgetMax !== undefined && filters.budgetMin > filters.budgetMax) {
		throw new BadRequestException('budgetMin phải nhỏ hơn hoặc bằng budgetMax', ErrorCode.PARAM_QUERY_ERROR)
	}

	if (filters.createdFrom && filters.createdTo && filters.createdFrom > filters.createdTo) {
		throw new BadRequestException('createdFrom phải nhỏ hơn hoặc bằng createdTo', ErrorCode.PARAM_QUERY_ERROR)
	}

	if (filters.statuses && filters.statuses.some(status => status !== JobStatus.PUBLISHED)) {
		throw new BadRequestException('Chỉ có thể xem job post đã được public', ErrorCode.PARAM_QUERY_ERROR)
	}

	const normalizedFilters: FreelancerJobPostFilterInput = {
		...filters,
		languageCodes: filters.languageCodes
			? uniquePreserveOrder(filters.languageCodes.map(code => code.toUpperCase()))
			: undefined,
		skillIds: filters.skillIds ? uniquePreserveOrder(filters.skillIds) : undefined
	}

	const where = buildPublicJobWhere(normalizedFilters)

	const orderBy: Prisma.JobPostOrderByWithRelationInput =
		sortBy === 'oldest' ? { createdAt: Prisma.SortOrder.asc } : { createdAt: Prisma.SortOrder.desc }

	const [items, total] = await prismaClient.$transaction([
		prismaClient.jobPost.findMany({
			where,
			include: publicJobSummaryInclude,
			orderBy,
			skip: (page - 1) * limit,
			take: limit
		}),
		prismaClient.jobPost.count({ where })
	])

	const jobIds = uniquePreserveOrder(items.map(item => item.id))

	await recordJobActivities(
		jobIds.map(jobId => ({
			jobId,
			actorId: viewerId ?? null,
			actorRole: viewerId ? Role.FREELANCER : null,
			action: 'FREELANCER_VIEW_JOB_SUMMARY',
			metadata: {
				scope: 'LIST',
				page,
				limit
			}
		}))
	)

	return {
		data: items.map(serializeJobSummary),
		total,
		page,
		limit
	}
}

const getJobPostDetail = async (jobId: string, viewerId?: string) => {
	const job = await prismaClient.jobPost.findFirst({
		where: {
			id: jobId,
			status: JobStatus.PUBLISHED,
			visibility: JobVisibility.PUBLIC,
			isDeleted: false
		},
		include: publicJobDetailInclude
	})

	if (!job) {
		throw new NotFoundException('Job post không tồn tại', ErrorCode.ITEM_NOT_FOUND)
	}

	await prismaClient.$transaction([
		prismaClient.jobPost.update({
			where: { id: jobId },
			data: { viewsCount: { increment: 1 } }
		}),
		prismaClient.jobActivityLog.create({
			data: {
				jobId,
				actorId: viewerId ?? null,
				actorRole: viewerId ? Role.FREELANCER : null,
				action: 'FREELANCER_VIEW_JOB_DETAIL',
				metadata: { scope: 'DETAIL' }
			}
		})
	])

	return serializeJobDetail(job)
}

export default {
	listJobPosts,
	getJobPostDetail
}
