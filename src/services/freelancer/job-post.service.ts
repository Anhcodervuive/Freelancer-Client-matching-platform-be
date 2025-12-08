import {
	JobStatus,
	JobVisibility,
	MatchInteractionSource,
	MatchInteractionType,
	Prisma,
	Role
} from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { JOB_MODERATION } from '~/config/environment'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { FreelancerJobPostFilterInput } from '~/schema/job-post.schema'
import matchInteractionService from '~/services/match-interaction.service'

const PUBLIC_JOB_STATUS_LIST = [JobStatus.PUBLISHED] as const
const PUBLIC_JOB_STATUSES = new Set<JobStatus>(PUBLIC_JOB_STATUS_LIST)

const buildModerationSafeWhere = (): Prisma.JobPostWhereInput | undefined => {
	const warningThreshold = JOB_MODERATION.WARNING_THRESHOLD
	if (!(warningThreshold > 0)) {
		return undefined
	}

	return {
		OR: [{ moderationScore: null }, { moderationScore: { lt: warningThreshold } }]
	}
}

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

const serializeJobSummary = (job: PublicJobSummaryPayload, options: { isSaved?: boolean } = {}) => {
	const { isSaved = false } = options
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
		attachmentsCount: job._count.attachments,
		isSaved
	}
}

const serializeJobDetail = (job: PublicJobDetailPayload, options: { isSaved?: boolean } = {}) => {
	const { isSaved = false } = options
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
		client: sanitizeClientSummary(job.client),
		isSaved
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

const ensurePublicJobExists = async (jobId: string) => {
	const moderationFilter = buildModerationSafeWhere()

	const job = await prismaClient.jobPost.findFirst({
		where: {
			id: jobId,
			status: { in: [...PUBLIC_JOB_STATUS_LIST] },
			visibility: JobVisibility.PUBLIC,
			isDeleted: false,
			...(moderationFilter ? { AND: moderationFilter } : {})
		},
		select: { id: true }
	})

	if (!job) {
		throw new NotFoundException('Job post không tồn tại', ErrorCode.ITEM_NOT_FOUND)
	}
}

const buildPublicJobWhere = (filters: FreelancerJobPostFilterInput, viewerId?: string): Prisma.JobPostWhereInput => {
	const moderationFilter = buildModerationSafeWhere()

	const where: Prisma.JobPostWhereInput = {
		status: { in: [...PUBLIC_JOB_STATUS_LIST] },
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

	const andConditions: Prisma.JobPostWhereInput[] = moderationFilter ? [moderationFilter] : []

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

	if (filters.savedOnly === true) {
		if (!viewerId) {
			throw new UnauthorizedException('Bạn cần đăng nhập để lọc job đã lưu', ErrorCode.UNAUTHORIED)
		}
		andConditions.push({ savedByFreelancers: { some: { freelancerId: viewerId } } })
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

	if (filters.statuses && filters.statuses.some(status => !PUBLIC_JOB_STATUSES.has(status))) {
		throw new BadRequestException('Chỉ có thể xem job post đã được public', ErrorCode.PARAM_QUERY_ERROR)
	}

	const normalizedFilters: FreelancerJobPostFilterInput = {
		...filters,
		languageCodes: filters.languageCodes
			? uniquePreserveOrder(filters.languageCodes.map(code => code.toUpperCase()))
			: undefined,
		skillIds: filters.skillIds ? uniquePreserveOrder(filters.skillIds) : undefined
	}

	// buildPublicJobWhere vẫn dùng để áp các filter chung: location, budget, dates, statuses, text, v.v.
	// IMPORTANT: chúng ta sẽ tách hai luồng:
	// A) Nếu caller có truyền skillIds/categoryId/specialtyId → chúng ta *bắt buộc* lọc theo đó (DB where)
	// B) Nếu không có các constraints chuyên môn → chọn jobs theo ML / match_feature (xếp hạng)
	const hasSkillOrTaxonomyFilter =
		(normalizedFilters.skillIds && normalizedFilters.skillIds.length > 0) ||
		Boolean(normalizedFilters.categoryId) ||
		Boolean(normalizedFilters.specialtyId)

	// base where từ các filter cơ bản
	const baseWhere = buildPublicJobWhere(normalizedFilters, viewerId)

	// Khi có filter chuyên môn: thực hiện query thẳng theo where (luồng A)
	if (hasSkillOrTaxonomyFilter) {
		const orderBy: Prisma.JobPostOrderByWithRelationInput =
			sortBy === 'oldest' ? { createdAt: Prisma.SortOrder.asc } : { createdAt: Prisma.SortOrder.desc }

		const [items, total] = await prismaClient.$transaction([
			prismaClient.jobPost.findMany({
				where: baseWhere,
				include: publicJobSummaryInclude,
				orderBy,
				skip: (page - 1) * limit,
				take: limit
			}),
			prismaClient.jobPost.count({ where: baseWhere })
		])

		const jobIds = items.map(i => i.id)
		const savedJobIds =
			viewerId && jobIds.length > 0
				? new Set(
						(
							await prismaClient.freelancerSavedJob.findMany({
								where: { freelancerId: viewerId, jobPostId: { in: jobIds } },
								select: { jobPostId: true }
							})
						).map(r => r.jobPostId)
				  )
				: new Set<string>()

		// record activities (giữ nguyên)
		await recordJobActivities(
			jobIds.map(jobId => ({
				jobId,
				actorId: viewerId ?? null,
				actorRole: viewerId ? Role.FREELANCER : null,
				action: 'FREELANCER_VIEW_JOB_SUMMARY',
				metadata: { scope: 'LIST', page, limit, filter_mode: 'taxonomy' }
			}))
		)

		const data = await Promise.all(
			items.map(async job => {
				const isSaved = savedJobIds.has(job.id)
				const summary = serializeJobSummary(job, { isSaved })
				// add recommendation metadata to keep UI consistent; source = 'filter'
				return { ...summary, recommendation: { source: 'filter', score: null } }
			})
		)

		return { data, total, page, limit }
	}

	// Nếu không có filter chuyên môn → luồng ML (B)
	// Step 1: lấy candidate jobs từ DB theo baseWhere BUT tăng limit (hăm hụt)
	//  - Lý do: nếu chỉ lấy page-size jobs rồi sắp theo ML, có thể bỏ qua job tốt ở page 2.
	//  - Strategy: lấy top N (page*limit hoặc cap), rồi sắp xếp bằng ML trên client side.
	const fetchCap = Math.max(limit * 3, 200) // bạn có thể tune: lấy nhiều hơn để ML có độ bao phủ
	const orderBy: Prisma.JobPostOrderByWithRelationInput =
		sortBy === 'oldest' ? { createdAt: Prisma.SortOrder.asc } : { createdAt: Prisma.SortOrder.desc }

	// Lấy candidate set (không paginate ngay) → sắp xếp/score bên server bằng ML
	const candidates = await prismaClient.jobPost.findMany({
		where: baseWhere,
		include: publicJobSummaryInclude,
		orderBy,
		take: fetchCap
	})

	const totalCandidates = candidates.length
	const candidateJobIds = candidates.map(j => j.id)

	// lấy saved flags
	const savedSet =
		viewerId && candidateJobIds.length > 0
			? new Set(
					(
						await prismaClient.freelancerSavedJob.findMany({
							where: { freelancerId: viewerId, jobPostId: { in: candidateJobIds } },
							select: { jobPostId: true }
						})
					).map(r => r.jobPostId)
			  )
			: new Set<string>()

	// Lấy match_feature cho pairs (jobId x viewerId)
	let matchFeatureMap: Record<string, any> = {}
	if (viewerId && candidateJobIds.length > 0) {
		const feats = await prismaClient.matchFeature.findMany({
			where: { jobId: { in: candidateJobIds }, freelancerId: viewerId },
			select: {
				jobId: true,
				pMatch: true,
				pFreelancerAccept: true,
				similarityScore: true,
				freelancerInviteAcceptRate: true,
				hasPastCollaboration: true,
				skillOverlapRatio: true
			}
		})
		for (const f of feats) matchFeatureMap[f.jobId] = f
	}

	// Lấy freelancerStats fallback nếu cần
	const freelancerStats = viewerId
		? await prismaClient.freelancerStats.findUnique({ where: { freelancerId: viewerId } })
		: null

	const clamp01 = (v: number | null | undefined) =>
		v === null || v === undefined || Number.isNaN(v) ? 0 : Math.max(0, Math.min(1, v))
	const computeFallbackScore = (mf: any | undefined, job: any) => {
		const sim = clamp01(mf?.similarityScore ?? job.metadata?.similarity_score ?? 0)
		let acceptRate = 0
		if (mf?.freelancerInviteAcceptRate != null) acceptRate = clamp01(mf.freelancerInviteAcceptRate)
		else if (freelancerStats) {
			const invites = Math.max(1, freelancerStats.invites ?? 0)
			const accepts = freelancerStats.accepts ?? 0
			acceptRate = clamp01(accepts / invites)
		}
		const pastBoost = mf?.hasPastCollaboration ? 0.05 : 0
		// weights: 0.7 sim, 0.25 accept, 0.05 past
		return clamp01(0.7 * sim + 0.25 * acceptRate + pastBoost)
	}

	// Build rows with unified score: prefer pMatch if available else fallback
	type Row = { job: any; unifiedScore: number; source: 'p_match' | 'fallback' | 'none'; mf?: any }
	const rows: Row[] = candidates.map(job => {
		const mf = matchFeatureMap[job.id]
		if (mf && mf.pMatch != null) return { job, unifiedScore: clamp01(mf.pMatch), source: 'p_match', mf }
		const fallback = computeFallbackScore(mf, job)
		return { job, unifiedScore: fallback, source: 'fallback', mf }
	})

	// sort desc by unifiedScore, tie-breaker by createdAt (or other)
	rows.sort((a, b) => {
		if (b.unifiedScore !== a.unifiedScore) return b.unifiedScore - a.unifiedScore
		// newer first
		return new Date(b.job.createdAt).getTime() - new Date(a.job.createdAt).getTime()
	})

	// paginate the sorted rows (apply page/limit)
	const start = (page - 1) * limit
	const pageRows = rows.slice(start, start + limit)

	// record activities
	await recordJobActivities(
		rows.slice(0, Math.min(50, rows.length)).map(r => ({
			jobId: r.job.id,
			actorId: viewerId ?? null,
			actorRole: viewerId ? Role.FREELANCER : null,
			action: 'FREELANCER_VIEW_JOB_SUMMARY',
			metadata: { scope: 'LIST', page, limit, mlUsed: true }
		}))
	)

	// serialize and return with recommendation meta
	const data = await Promise.all(
		pageRows.map(async ({ job, unifiedScore, source, mf }) => {
			const isSaved = savedSet.has(job.id)
			const summary = serializeJobSummary(job, { isSaved })
			const recommendation = {
				source,
				score: unifiedScore,
				diagnostics: {
					pMatch: mf?.pMatch ?? null,
					similarityScore: mf?.similarityScore ?? job.metadata?.similarity_score ?? null,
					pFreelancerAccept: mf?.pFreelancerAccept ?? null
				}
			}
			return { ...summary, recommendation }
		})
	)

	const total = totalCandidates // total of candidate set (we used cap; if you want full count use prisma count(baseWhere) separately)
	return { data, total, page, limit }
}

const getJobPostDetail = async (jobId: string, viewerId?: string) => {
	const moderationFilter = buildModerationSafeWhere()

	const job = await prismaClient.jobPost.findFirst({
		where: {
			id: jobId,
			status: { in: [...PUBLIC_JOB_STATUS_LIST] },
			visibility: JobVisibility.PUBLIC,
			isDeleted: false,
			...(moderationFilter ? { AND: moderationFilter } : {})
		},
		include: publicJobDetailInclude
	})

	if (!job) {
		throw new NotFoundException('Job post không tồn tại', ErrorCode.ITEM_NOT_FOUND)
	}

	const isSaved = viewerId
		? Boolean(
				await prismaClient.freelancerSavedJob.findUnique({
					where: {
						freelancerId_jobPostId: {
							freelancerId: viewerId,
							jobPostId: jobId
						}
					},
					select: { jobPostId: true }
				})
		  )
		: false

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

	await matchInteractionService.persistInteraction({
		type: MatchInteractionType.JOB_VIEW,
		source: MatchInteractionSource.DIRECT,
		jobId,
		...(viewerId
			? {
					freelancerId: viewerId,
					actorProfileId: viewerId,
					actorRole: Role.FREELANCER
			  }
			: {})
	})

	return serializeJobDetail(job, { isSaved })
}

const saveJobPost = async (jobId: string, freelancerId: string) => {
	await ensurePublicJobExists(jobId)

	const existing = await prismaClient.freelancerSavedJob.findUnique({
		where: {
			freelancerId_jobPostId: {
				freelancerId,
				jobPostId: jobId
			}
		}
	})

	if (existing) {
		return
	}

	await prismaClient.$transaction([
		prismaClient.freelancerSavedJob.create({
			data: {
				freelancerId,
				jobPostId: jobId
			}
		}),
		prismaClient.jobActivityLog.create({
			data: {
				jobId,
				actorId: freelancerId,
				actorRole: Role.FREELANCER,
				action: 'FREELANCER_SAVE_JOB',
				metadata: { scope: 'SAVE' }
			}
		})
	])
}

const unsaveJobPost = async (jobId: string, freelancerId: string) => {
	const existing = await prismaClient.freelancerSavedJob.findUnique({
		where: {
			freelancerId_jobPostId: {
				freelancerId,
				jobPostId: jobId
			}
		}
	})

	if (!existing) {
		throw new NotFoundException('Freelancer chưa lưu job này', ErrorCode.ITEM_NOT_FOUND)
	}

	await prismaClient.$transaction([
		prismaClient.freelancerSavedJob.delete({
			where: {
				freelancerId_jobPostId: {
					freelancerId,
					jobPostId: jobId
				}
			}
		}),
		prismaClient.jobActivityLog.create({
			data: {
				jobId,
				actorId: freelancerId,
				actorRole: Role.FREELANCER,
				action: 'FREELANCER_UNSAVE_JOB',
				metadata: { scope: 'UNSAVE' }
			}
		})
	])
}

export default {
	listJobPosts,
	getJobPostDetail,
	saveJobPost,
	unsaveJobPost
}
