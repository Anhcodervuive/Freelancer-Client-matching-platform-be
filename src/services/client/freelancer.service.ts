import { PortfolioVisibility, Prisma, Role } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { ClientFreelancerFilterInput } from '~/schema/freelancer.schema'
import assetService from '../asset.service'

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

const freelancerSummaryInclude = Prisma.validator<Prisma.FreelancerInclude>()({
	profile: {
		select: {
			firstName: true,
			lastName: true,
			country: true,
			city: true
		}
	},
	languages: true,
	freelancerSpecialtySelection: {
		where: { isDeleted: false },
		include: {
			specialty: {
				select: {
					id: true,
					name: true,
					category: {
						select: { id: true, name: true }
					}
				}
			}
		}
	},
	freelancerSkillSelection: {
		where: { isDeleted: false },
		include: {
			skill: {
				select: {
					id: true,
					name: true,
					slug: true
				}
			}
		}
	}
})

const freelancerDetailInclude = Prisma.validator<Prisma.FreelancerInclude>()({
	...freelancerSummaryInclude,
	educations: {
		orderBy: { startYear: Prisma.SortOrder.desc }
	},
	portfolios: {
		where: { isDeleted: false, visibility: PortfolioVisibility.PUBLIC },
		orderBy: { createdAt: Prisma.SortOrder.desc },
		include: {
			skills: {
				include: {
					skill: {
						select: {
							id: true,
							name: true,
							slug: true
						}
					}
				}
			}
		}
	}
})

type FreelancerSummaryPayload = Prisma.FreelancerGetPayload<{ include: typeof freelancerSummaryInclude }>
type FreelancerDetailPayload = Prisma.FreelancerGetPayload<{ include: typeof freelancerDetailInclude }>

type FreelancerSummaryLike = Pick<
	FreelancerSummaryPayload,
	| 'userId'
	| 'title'
	| 'bio'
	| 'links'
	| 'profile'
	| 'languages'
	| 'freelancerSkillSelection'
	| 'freelancerSpecialtySelection'
	| 'createdAt'
	| 'updatedAt'
>

const ensureClientUser = async (userId: string) => {
	const client = await prismaClient.client.findUnique({
		where: { userId }
	})

	if (!client) {
		throw new UnauthorizedException('Chỉ client mới có thể xem danh sách freelancer', ErrorCode.USER_NOT_AUTHORITY)
	}

	return client
}

const ensureFreelancerUser = async (freelancerId: string) => {
	const freelancer = await prismaClient.freelancer.findFirst({
		where: {
			userId: freelancerId,
			profile: {
				is: {
					user: {
						isActive: true,
						deletedAt: null,
						role: Role.FREELANCER
					}
				}
			}
		},
		select: { userId: true }
	})

	if (!freelancer) {
		throw new NotFoundException('Không tìm thấy freelancer', ErrorCode.ITEM_NOT_FOUND)
	}

	return freelancer
}

const normalizeLinks = (value: Prisma.JsonValue | null) => {
	if (!value) return []
	if (Array.isArray(value)) {
		const seen = new Set<string>()
		const links: string[] = []
		for (const entry of value) {
			if (typeof entry !== 'string') continue
			const trimmed = entry.trim()
			if (!trimmed || seen.has(trimmed)) continue
			seen.add(trimmed)
			links.push(trimmed)
		}
		return links
	}
	return []
}

const mapSkills = (relations: FreelancerSummaryPayload['freelancerSkillSelection']) => {
	return relations
		.map(relation => ({
			id: relation.skill.id,
			name: relation.skill.name,
			slug: relation.skill.slug,
			orderHint: relation.orderHint ?? null
		}))
		.sort((a, b) => {
			const hintA = a.orderHint ?? Number.MAX_SAFE_INTEGER
			const hintB = b.orderHint ?? Number.MAX_SAFE_INTEGER
			if (hintA !== hintB) return hintA - hintB
			return a.name.localeCompare(b.name)
		})
}

const mapSpecialties = (relations: FreelancerSummaryPayload['freelancerSpecialtySelection']) => {
	return relations.map(relation => ({
		id: relation.specialty.id,
		name: relation.specialty.name,
		category: {
			id: relation.specialty.category.id,
			name: relation.specialty.category.name
		}
	}))
}

const buildDisplayName = (profile: FreelancerSummaryPayload['profile']) => {
	if (!profile) return null
	const firstName = profile.firstName ?? ''
	const lastNameInitial = profile.lastName ? `${profile.lastName[0]}.` : ''
	const combined = `${firstName} ${lastNameInitial}`.trim()
	return combined.length > 0 ? combined : null
}

const mapEducations = (educations: FreelancerDetailPayload['educations']) => {
	return educations.map(education => ({
		id: education.id,
		schoolName: education.schoolName,
		degreeTitle: education.degreeTitle,
		fieldOfStudy: education.fieldOfStudy ?? null,
		startYear: education.startYear ?? null,
		endYear: education.endYear ?? null
	}))
}

const mapPortfolioSkills = (skills: FreelancerDetailPayload['portfolios'][number]['skills']) => {
	return skills.map(relation => ({
		id: relation.skill.id,
		name: relation.skill.name,
		slug: relation.skill.slug
	}))
}

const mapPortfolios = (portfolios: FreelancerDetailPayload['portfolios']) => {
	return portfolios.map(portfolio => ({
		id: portfolio.id,
		title: portfolio.title,
		role: portfolio.role ?? null,
		description: portfolio.description ?? null,
		projectUrl: portfolio.projectUrl ?? null,
		repositoryUrl: portfolio.repositoryUrl ?? null,
		visibility: portfolio.visibility,
		startedAt: portfolio.startedAt ?? null,
		completedAt: portfolio.completedAt ?? null,
		publishedAt: portfolio.publishedAt ?? null,
		createdAt: portfolio.createdAt,
		updatedAt: portfolio.updatedAt,
		skills: mapPortfolioSkills(portfolio.skills)
	}))
}

const serializeFreelancerSummary = (
	freelancer: FreelancerSummaryLike,
	avatarUrl: string | null,
	options: { isSaved?: boolean } = {}
) => {
	const { isSaved = false } = options

	return {
		id: freelancer.userId,
		title: freelancer.title ?? null,
		bio: freelancer.bio ?? null,
		links: normalizeLinks(freelancer.links ?? null),
		profile: {
			displayName: buildDisplayName(freelancer.profile),
			avatarUrl,
			location: {
				country: freelancer.profile?.country ?? null,
				city: freelancer.profile?.city ?? null
			}
		},
		languages: freelancer.languages.map(language => ({
			languageCode: language.languageCode,
			proficiency: language.proficiency
		})),
		skills: mapSkills(freelancer.freelancerSkillSelection),
		specialties: mapSpecialties(freelancer.freelancerSpecialtySelection),
		createdAt: freelancer.createdAt,
		updatedAt: freelancer.updatedAt,
		isSaved
	}
}

const serializeFreelancerDetail = (
	freelancer: FreelancerDetailPayload,
	avatarUrl: string | null,
	options: { isSaved?: boolean } = {}
) => {
	const summary = serializeFreelancerSummary(freelancer, avatarUrl, options)

	return {
		...summary,
		educations: mapEducations(freelancer.educations),
		portfolios: mapPortfolios(freelancer.portfolios)
	}
}

const buildFreelancerWhere = (
	filters: ClientFreelancerFilterInput,
	clientUserId: string
): Prisma.FreelancerWhereInput => {
	const where: Prisma.FreelancerWhereInput = {
		profile: {
			is: {
				user: {
					isActive: true,
					deletedAt: null,
					role: Role.FREELANCER
				}
			}
		}
	}

	const andConditions: Prisma.FreelancerWhereInput[] = []

	if (filters.specialtyId) {
		andConditions.push({
			freelancerSpecialtySelection: { some: { specialtyId: filters.specialtyId, isDeleted: false } }
		})
	}

	if (filters.skillIds && filters.skillIds.length > 0) {
		for (const skillId of filters.skillIds) {
			andConditions.push({
				freelancerSkillSelection: { some: { skillId, isDeleted: false } }
			})
		}
	}

	if (filters.country) {
		andConditions.push({
			profile: {
				is: {
					country: { equals: filters.country }
				}
			}
		})
	}

	if (filters.invitedJobId) {
		andConditions.push({
			jobInvitations: {
				some: {
					jobId: filters.invitedJobId,
					clientId: clientUserId,
					job: {
						is: {
							id: filters.invitedJobId,
							clientId: clientUserId
						}
					}
				}
			}
		})
	}

	if (typeof filters.saved === 'boolean') {
		const relationFilter: Prisma.ClientSavedFreelancerWhereInput = {
			clientId: clientUserId
		}

		if (filters.saved) {
			andConditions.push({
				savedByClients: { some: relationFilter }
			})
		} else {
			andConditions.push({
				savedByClients: { none: relationFilter }
			})
		}
	}

	if (andConditions.length > 0) {
		where.AND = andConditions
	}

	if (filters.search) {
		const search = filters.search
		where.OR = [
			{ title: { contains: search } },
			{ bio: { contains: search } },
			{
				profile: {
					is: {
						OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }]
					}
				}
			}
		]
	}

	return where
}

const listFreelancers = async (clientUserId: string, filters: ClientFreelancerFilterInput) => {
	await ensureClientUser(clientUserId)

	const normalizedFilters: ClientFreelancerFilterInput = {
		...filters,
		skillIds: filters.skillIds ? uniquePreserveOrder(filters.skillIds) : undefined
	}

	const page = Math.max(1, normalizedFilters.page || 1)
	const limit = Math.max(1, normalizedFilters.limit || 20)

	const where = buildFreelancerWhere(normalizedFilters, clientUserId)

	// nếu có jobId thì ưu tiên ranking dựa trên match_feature
	const jobId = filters.jobId

	// helper: safe numeric coercion
	const toNum = (v: any) => {
		const n = Number(v)
		return Number.isFinite(n) ? n : 0
	}

	if (jobId) {
		// 1) Lấy tất cả freelancer matching 'where' (không paginate) — để tính score chính xác rồi paginate ở memory
		// Bỏ where ra vì đâu phải freelancer nào match với mình cũng sẽ có category & skill trùng 100% vì where này nếu k trùng 100% thì k được tính
		const allFreelancers = await prismaClient.freelancer.findMany({
			// where,
			include: freelancerSummaryInclude, // vẫn lấy đủ fields cho serialization
			orderBy: { updatedAt: Prisma.SortOrder.desc } // fallback order
		})

		const total = allFreelancers.length
		const freelancerIds = allFreelancers.map(f => f.userId)

		// 2) Lấy tất cả match_feature cho jobId + những freelancerIds
		const matchFeatures = await prismaClient.matchFeature.findMany({
			where: {
				jobId,
				freelancerId: { in: freelancerIds }
			},
			select: {
				freelancerId: true,
				pMatch: true,
				pFreelancerAccept: true,
				similarityScore: true,
				skillOverlapRatio: true,
				freelancerInviteAcceptRate: true,
				freelancerRegion: true,
				lastInteractionAt: true,
				// lấy thêm những trường fallback bạn muốn dùng
				skillOverlapCount: true,
				freelancerSkillCount: true,
				jobRequiredSkillCount: true
			}
		})

		// map by freelancerId
		const mfById = new Map<string, any>()
		matchFeatures.forEach(mf => mfById.set(mf.freelancerId, mf))

		// 3) build score for each freelancer
		// Score logic (you can tweak weights):
		// If pMatch exists -> base = pMatch
		// else -> base = normalize(similarityScore) in [0..1]
		// adjust by: skillOverlapRatio, freelancerInviteAcceptRate, pFreelancerAccept (if exists)
		const computeScore = (f: any) => {
			const mf = mfById.get(f.userId)

			// fallback values
			const similarity = toNum(mf?.similarityScore)
			const skillOverlapRatio = toNum(mf?.skillOverlapRatio)
			const inviteAcceptRate = toNum(mf?.freelancerInviteAcceptRate)
			const pMatch = mf?.pMatch != null ? toNum(mf.pMatch) : null
			const pFreelancerAccept = mf?.pFreelancerAccept != null ? toNum(mf.pFreelancerAccept) : null

			// normalize similarityScore if it's not already 0..1
			// assume similarityScore might be 0..100 or 0..1; try both:
			let simNorm = similarity
			if (simNorm > 1.0) {
				// assume 0..100
				simNorm = Math.min(1, simNorm / 100)
			} else {
				simNorm = Math.max(0, Math.min(1, simNorm))
			}

			// base score
			let base = pMatch ?? 0.7 * simNorm + 0.3 * skillOverlapRatio // if no pMatch, combine sim + overlap

			// adjust by invite accept rate
			// if pFreelancerAccept exists, use as multiplier factor (gives more weight)
			const acceptFactor = pFreelancerAccept != null ? 0.6 + 0.4 * pFreelancerAccept : 0.8 + 0.2 * inviteAcceptRate
			// final score
			let score = base * acceptFactor

			// small boost if skillOverlapRatio present
			score += 0.05 * skillOverlapRatio

			// ensure in [0..1]
			score = Math.max(0, Math.min(1, score))

			return {
				score,
				details: {
					pMatch,
					pFreelancerAccept,
					similarity: simNorm,
					skillOverlapRatio,
					inviteAcceptRate
				}
			}
		}

		// 4) compute score for all freelancers and sort
		const scored = allFreelancers.map(f => {
			const s = computeScore(f)
			return { freelancer: f, score: s.score, details: s.details }
		})

		scored.sort((a, b) => b.score - a.score)

		// 5) paginate in-memory
		const start = (page - 1) * limit
		const paged = scored.slice(start, start + limit)

		// 6) savedFreelancerIds
		const pagedFreelancerIds = paged.map(p => p.freelancer.userId)
		const savedFreelancerRows =
			pagedFreelancerIds.length > 0
				? await prismaClient.clientSavedFreelancer.findMany({
						where: {
							clientId: clientUserId,
							freelancerId: { in: pagedFreelancerIds }
						},
						select: { freelancerId: true }
				  })
				: []
		const savedFreelancerIds = new Set(savedFreelancerRows.map(r => r.freelancerId))

		// 7) serialize results (preserve order)
		const data = await Promise.all(
			paged.map(async ({ freelancer, score, details }) => {
				const avatarUrl = await assetService.getProfileAvatarUrl(freelancer.userId)
				const isSaved = savedFreelancerIds.has(freelancer.userId)

				// 1) gọi serialize trước, không gán recommendation trong cùng 1 biểu thức
				const summary = serializeFreelancerSummary(freelancer, avatarUrl, { isSaved })

				// 2) chuẩn bị object recommendation riêng
				const recommendation = {
					score,
					...details
				}

				// 3) trả về object mới (không tham chiếu vòng)
				// Nếu summary có type, bạn có thể làm intersection type để giữ typing
				const payload = { ...summary, recommendation } as unknown as typeof summary & {
					recommendation: typeof recommendation
				}

				return payload
			})
		)

		return {
			data,
			total,
			page,
			limit
		}
	} else {
		// fallback: no jobId — original behaviour (DB-side pagination)
		const [items, total] = await prismaClient.$transaction([
			prismaClient.freelancer.findMany({
				where,
				include: freelancerSummaryInclude,
				orderBy: { updatedAt: Prisma.SortOrder.desc },
				skip: (page - 1) * limit,
				take: limit
			}),
			prismaClient.freelancer.count({ where })
		])

		const freelancerIds = items.map(freelancer => freelancer.userId)

		const savedFreelancerIds = new Set(
			freelancerIds.length > 0
				? (
						await prismaClient.clientSavedFreelancer.findMany({
							where: {
								clientId: clientUserId,
								freelancerId: { in: freelancerIds }
							},
							select: { freelancerId: true }
						})
				  ).map(relation => relation.freelancerId)
				: []
		)

		const data = await Promise.all(
			items.map(async (freelancer: any) => {
				const avatarUrl = await assetService.getProfileAvatarUrl(freelancer.userId)
				const isSaved = savedFreelancerIds.has(freelancer.userId)
				return serializeFreelancerSummary(freelancer, avatarUrl, { isSaved })
			})
		)

		return {
			data,
			total,
			page,
			limit
		}
	}
}

const getFreelancerDetail = async (clientUserId: string, freelancerId: string) => {
	await ensureClientUser(clientUserId)

	const freelancer = await prismaClient.freelancer.findFirst({
		where: {
			userId: freelancerId,
			profile: {
				is: {
					user: {
						isActive: true,
						deletedAt: null,
						role: Role.FREELANCER
					}
				}
			}
		},
		include: freelancerDetailInclude
	})

	if (!freelancer) {
		throw new NotFoundException('Không tìm thấy freelancer', ErrorCode.ITEM_NOT_FOUND)
	}

	const avatarUrl = await assetService.getProfileAvatarUrl(freelancer.userId)

	const savedRelation = await prismaClient.clientSavedFreelancer.findUnique({
		where: {
			clientId_freelancerId: {
				clientId: clientUserId,
				freelancerId
			}
		},
		select: { freelancerId: true }
	})
	const isSaved = Boolean(savedRelation)

	return serializeFreelancerDetail(freelancer, avatarUrl, { isSaved })
}

const saveFreelancer = async (clientUserId: string, freelancerId: string) => {
	await ensureClientUser(clientUserId)
	await ensureFreelancerUser(freelancerId)

	const existing = await prismaClient.clientSavedFreelancer.findUnique({
		where: {
			clientId_freelancerId: {
				clientId: clientUserId,
				freelancerId
			}
		}
	})

	if (existing) {
		return
	}

	await prismaClient.clientSavedFreelancer.create({
		data: {
			clientId: clientUserId,
			freelancerId
		}
	})
}

const unsaveFreelancer = async (clientUserId: string, freelancerId: string) => {
	await ensureClientUser(clientUserId)

	const existing = await prismaClient.clientSavedFreelancer.findUnique({
		where: {
			clientId_freelancerId: {
				clientId: clientUserId,
				freelancerId
			}
		}
	})

	if (!existing) {
		throw new NotFoundException('Client chưa lưu freelancer này', ErrorCode.ITEM_NOT_FOUND)
	}

	await prismaClient.clientSavedFreelancer.delete({
		where: {
			clientId_freelancerId: {
				clientId: clientUserId,
				freelancerId
			}
		}
	})
}

export default {
	listFreelancers,
	getFreelancerDetail,
	saveFreelancer,
	unsaveFreelancer
}
