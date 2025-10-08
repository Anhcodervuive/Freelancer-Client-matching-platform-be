import { Prisma } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { ContractListFilterInput } from '~/schema/contract.schema'

const contractJobSummarySelect = Prisma.validator<Prisma.JobPostSelect>()({
        id: true,
        title: true,
        status: true,
        paymentMode: true,
        budgetAmount: true,
        budgetCurrency: true
})

const contractClientSelect = Prisma.validator<Prisma.ClientSelect>()({
        userId: true,
        companyName: true,
        profile: {
                select: {
                        firstName: true,
                        lastName: true,
                        country: true,
                        city: true
                }
        }
})

const contractFreelancerSelect = Prisma.validator<Prisma.FreelancerSelect>()({
        userId: true,
        title: true,
        profile: {
                select: {
                        firstName: true,
                        lastName: true,
                        country: true,
                        city: true
                }
        }
})

const contractSummaryInclude = Prisma.validator<Prisma.ContractInclude>()({
        jobPost: {
                select: contractJobSummarySelect
        },
        client: {
                select: contractClientSelect
        },
        freelancer: {
                select: contractFreelancerSelect
        }
})

const contractJobDetailInclude = Prisma.validator<Prisma.JobPostInclude>()({
        specialty: {
                include: {
                        category: true
                }
        },
        languages: true,
        requiredSkills: {
                include: { skill: true }
        },
        screeningQuestions: true,
        attachments: {
                include: {
                        assetLink: {
                                include: {
                                        asset: true
                                }
                        }
                }
        }
})

const contractDetailInclude = Prisma.validator<Prisma.ContractInclude>()({
        jobPost: {
                include: contractJobDetailInclude
        },
        client: {
                select: contractClientSelect
        },
        freelancer: {
                select: contractFreelancerSelect
        },
        proposal: {
                select: {
                        id: true,
                        status: true,
                        submittedAt: true
                }
        },
        offer: {
                select: {
                        id: true,
                        status: true,
                        sentAt: true
                }
        }
})

const milestoneInclude = Prisma.validator<Prisma.MilestoneInclude>()({
        escrow: {
                select: {
                        id: true,
                        status: true,
                        currency: true,
                        amountFunded: true,
                        amountReleased: true,
                        amountRefunded: true,
                        createdAt: true,
                        updatedAt: true
                }
        }
})

type ContractSummaryPayload = Prisma.ContractGetPayload<{ include: typeof contractSummaryInclude }>
type ContractDetailPayload = Prisma.ContractGetPayload<{ include: typeof contractDetailInclude }>
type MilestonePayload = Prisma.MilestoneGetPayload<{ include: typeof milestoneInclude }>
type ContractJobSkillRelation = NonNullable<ContractDetailPayload['jobPost']>['requiredSkills'][number]

type ProfileSummary = ContractSummaryPayload['client']['profile'] | null

type SerializedProfile = {
        firstName: string | null
        lastName: string | null
        displayName: string | null
        location: {
                country: string | null
                city: string | null
        }
}

const buildDisplayName = (profile: ProfileSummary): string | null => {
        if (!profile) return null
        const firstName = profile.firstName ?? ''
        const lastNameInitial = profile.lastName ? `${profile.lastName[0]}.` : ''
        const combined = `${firstName} ${lastNameInitial}`.trim()
        return combined.length > 0 ? combined : null
}

const serializeProfile = (profile: ProfileSummary): SerializedProfile => {
        return {
                firstName: profile?.firstName ?? null,
                lastName: profile?.lastName ?? null,
                displayName: buildDisplayName(profile),
                location: {
                        country: profile?.country ?? null,
                        city: profile?.city ?? null
                }
        }
}

const serializeClient = (contract: ContractSummaryPayload['client']) => {
        if (!contract) return null

        return {
                id: contract.userId,
                companyName: contract.companyName ?? null,
                profile: serializeProfile(contract.profile)
        }
}

const serializeFreelancer = (freelancer: ContractSummaryPayload['freelancer']) => {
        return {
                id: freelancer.userId,
                title: freelancer.title ?? null,
                profile: serializeProfile(freelancer.profile)
        }
}

const serializeJobPostSummary = (jobPost: ContractSummaryPayload['jobPost']) => {
        if (!jobPost) return null

        return {
                id: jobPost.id,
                title: jobPost.title,
                status: jobPost.status,
                paymentMode: jobPost.paymentMode,
                budgetAmount: jobPost.budgetAmount ? Number(jobPost.budgetAmount) : null,
                budgetCurrency: jobPost.budgetCurrency ?? null
        }
}

const sortScreeningQuestions = <T extends { orderIndex: number; createdAt: Date }>(
        questions: readonly T[]
) => {
        return [...questions].sort((a, b) => {
                if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex
                return a.createdAt.getTime() - b.createdAt.getTime()
        })
}

const mapJobSkills = (relations: readonly ContractJobSkillRelation[]) => {
        const required: { id: string; name: string; slug: string; orderHint: number | null }[] = []
        const preferred: { id: string; name: string; slug: string; orderHint: number | null }[] = []

        const sorted = [...relations].sort((a, b) => {
                if (a.isPreferred !== b.isPreferred) {
                        return a.isPreferred ? 1 : -1
                }

                const hintA = a.orderHint ?? Number.MAX_SAFE_INTEGER
                const hintB = b.orderHint ?? Number.MAX_SAFE_INTEGER

                if (hintA !== hintB) {
                        return hintA - hintB
                }

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

const serializeJobPostDetail = (jobPost: ContractDetailPayload['jobPost']) => {
        if (!jobPost) return null

        const skills = mapJobSkills(jobPost.requiredSkills)
        const attachments = jobPost.attachments
                .map(attachment => ({
                        id: attachment.id,
                        assetLinkId: attachment.assetLinkId,
                        addedBy: attachment.addedBy ?? null,
                        createdAt: attachment.createdAt,
                        updatedAt: attachment.updatedAt,
                        position: attachment.assetLink.position,
                        isPrimary: attachment.assetLink.isPrimary,
                        label: attachment.assetLink.label ?? null,
                        caption: attachment.assetLink.caption ?? null,
                        asset: {
                                id: attachment.assetLink.assetId,
                                kind: attachment.assetLink.asset.kind,
                                url: attachment.assetLink.asset.url ?? null,
                                publicId: attachment.assetLink.asset.publicId ?? null,
                                mimeType: attachment.assetLink.asset.mimeType ?? null,
                                bytes: attachment.assetLink.asset.bytes ?? null,
                                width: attachment.assetLink.asset.width ?? null,
                                height: attachment.assetLink.asset.height ?? null
                        }
                }))
                .sort((a, b) => a.position - b.position)

        const specialty = jobPost.specialty
                ? {
                          id: jobPost.specialty.id,
                          name: jobPost.specialty.name,
                          category: jobPost.specialty.category
                                  ? {
                                            id: jobPost.specialty.category.id,
                                            name: jobPost.specialty.category.name
                                    }
                                  : null
                  }
                : null

        return {
                id: jobPost.id,
                title: jobPost.title,
                status: jobPost.status,
                paymentMode: jobPost.paymentMode,
                budgetAmount: jobPost.budgetAmount ? Number(jobPost.budgetAmount) : null,
                budgetCurrency: jobPost.budgetCurrency ?? null,
                description: jobPost.description,
                duration: jobPost.duration ?? null,
                experienceLevel: jobPost.experienceLevel,
                locationType: jobPost.locationType,
                preferredLocations: Array.isArray(jobPost.preferredLocations)
                        ? jobPost.preferredLocations
                        : [],
                customTerms: (jobPost.customTerms ?? null) as Record<string, unknown> | null,
                visibility: jobPost.visibility,
                publishedAt: jobPost.publishedAt ?? null,
                closedAt: jobPost.closedAt ?? null,
                createdAt: jobPost.createdAt,
                updatedAt: jobPost.updatedAt,
                specialty,
                languages: jobPost.languages.map(language => ({
                        languageCode: language.languageCode,
                        proficiency: language.proficiency
                })),
                skills,
                screeningQuestions: sortScreeningQuestions(jobPost.screeningQuestions).map(question => ({
                        id: question.id,
                        question: question.question,
                        isRequired: question.isRequired,
                        orderIndex: question.orderIndex
                })),
                attachments
        }
}

const serializeContractSummary = (contract: ContractSummaryPayload) => {
        return {
                id: contract.id,
                title: contract.title,
                currency: contract.currency,
                clientId: contract.clientId,
                freelancerId: contract.freelancerId,
                jobPostId: contract.jobPostId,
                proposalId: contract.proposalId,
                offerId: contract.offerId,
                jobPost: serializeJobPostSummary(contract.jobPost),
                client: serializeClient(contract.client),
                freelancer: serializeFreelancer(contract.freelancer),
                createdAt: contract.createdAt,
                updatedAt: contract.updatedAt
        }
}

const serializeContractDetail = (contract: ContractDetailPayload) => {
        const base = serializeContractSummary(contract)

        return {
                ...base,
                jobPost: serializeJobPostDetail(contract.jobPost),
                proposal: contract.proposal
                        ? {
                                  id: contract.proposal.id,
                                  status: contract.proposal.status,
                                  submittedAt: contract.proposal.submittedAt
                          }
                        : null,
                offer: contract.offer
                        ? {
                                  id: contract.offer.id,
                                  status: contract.offer.status,
                                  sentAt: contract.offer.sentAt
                          }
                        : null
        }
}

const serializeMilestone = (milestone: MilestonePayload) => {
        return {
                id: milestone.id,
                contractId: milestone.contractId,
                title: milestone.title,
                amount: Number(milestone.amount),
                currency: milestone.currency,
                status: milestone.status,
                updatedAt: milestone.updatedAt,
                escrow: milestone.escrow
                        ? {
                                  id: milestone.escrow.id,
                                  status: milestone.escrow.status,
                                  currency: milestone.escrow.currency,
                                  amountFunded: Number(milestone.escrow.amountFunded),
                                  amountReleased: Number(milestone.escrow.amountReleased),
                                  amountRefunded: Number(milestone.escrow.amountRefunded),
                                  createdAt: milestone.escrow.createdAt,
                                  updatedAt: milestone.escrow.updatedAt
                          }
                        : null
        }
}

const ensureContractAccess = async (contractId: string, userId: string) => {
        const contract = await prismaClient.contract.findFirst({
                where: {
                        id: contractId,
                        OR: [{ clientId: userId }, { freelancerId: userId }]
                },
                select: { id: true }
        })

        if (!contract) {
                throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
        }
}

const buildContractWhere = (
        userId: string,
        filters: ContractListFilterInput
): Prisma.ContractWhereInput => {
        const andConditions: Prisma.ContractWhereInput[] = []

        if (filters.role === 'client') {
                andConditions.push({ clientId: userId })
        } else if (filters.role === 'freelancer') {
                andConditions.push({ freelancerId: userId })
        } else {
                andConditions.push({ OR: [{ clientId: userId }, { freelancerId: userId }] })
        }

        if (filters.search) {
                const search = filters.search
                andConditions.push({
                        OR: [
                                { title: { contains: search } },
                                { jobPost: { title: { contains: search } } }
                        ]
                })
        }

        if (andConditions.length === 1) {
                return andConditions[0]!
        }

        return { AND: andConditions }
}

const listContracts = async (userId: string, filters: ContractListFilterInput) => {
        const page = filters.page
        const limit = filters.limit
        const skip = (page - 1) * limit
        const where = buildContractWhere(userId, filters)

        const [contracts, total] = await prismaClient.$transaction([
                prismaClient.contract.findMany({
                        where,
                        include: contractSummaryInclude,
                        orderBy: { createdAt: 'desc' },
                        skip,
                        take: limit
                }),
                prismaClient.contract.count({ where })
        ])

        const data = contracts.map(contract => serializeContractSummary(contract))
        const totalPages = Math.ceil(total / limit)

        return {
                data,
                pagination: {
                        page,
                        limit,
                        total,
                        totalPages
                }
        }
}

const getContractDetail = async (userId: string, contractId: string) => {
        const contract = await prismaClient.contract.findFirst({
                where: {
                        id: contractId,
                        OR: [{ clientId: userId }, { freelancerId: userId }]
                },
                include: contractDetailInclude
        })

        if (!contract) {
                throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
        }

        return serializeContractDetail(contract)
}

const listContractMilestones = async (userId: string, contractId: string) => {
        await ensureContractAccess(contractId, userId)

        const milestones = await prismaClient.milestone.findMany({
                where: { contractId },
                include: milestoneInclude,
                orderBy: { updatedAt: 'desc' }
        })

        return milestones.map(serializeMilestone)
}

const contractService = {
        listContracts,
        getContractDetail,
        listContractMilestones
}

export default contractService
