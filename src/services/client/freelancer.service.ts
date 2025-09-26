import { Prisma, Role } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { ErrorCode } from '~/exceptions/root'
import { ClientFreelancerFilterInput } from '~/schema/freelancer.schema'

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

type FreelancerSummaryPayload = Prisma.FreelancerGetPayload<{ include: typeof freelancerSummaryInclude }>

const ensureClientUser = async (userId: string) => {
        const client = await prismaClient.client.findUnique({
                where: { userId }
        })

        if (!client) {
                throw new UnauthorizedException('Chỉ client mới có thể xem danh sách freelancer', ErrorCode.USER_NOT_AUTHORITY)
        }

        return client
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

const serializeFreelancerSummary = (freelancer: FreelancerSummaryPayload) => {
        return {
                id: freelancer.userId,
                title: freelancer.title ?? null,
                bio: freelancer.bio ?? null,
                links: normalizeLinks(freelancer.links ?? null),
                profile: {
                        displayName: buildDisplayName(freelancer.profile),
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
                updatedAt: freelancer.updatedAt
        }
}

const buildFreelancerWhere = (filters: ClientFreelancerFilterInput): Prisma.FreelancerWhereInput => {
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
                                                OR: [
                                                        { firstName: { contains: search } },
                                                        { lastName: { contains: search } }
                                                ]
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

        const page = normalizedFilters.page
        const limit = normalizedFilters.limit

        const where = buildFreelancerWhere(normalizedFilters)

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

        return {
                data: items.map(serializeFreelancerSummary),
                total,
                page,
                limit
        }
}

export default {
        listFreelancers
}
