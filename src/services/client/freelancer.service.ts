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

	console.log(normalizedFilters)

	const page = normalizedFilters.page
	const limit = normalizedFilters.limit

	const where = buildFreelancerWhere(normalizedFilters, clientUserId)
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
