import { Prisma } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { ContractListFilterInput } from '~/schema/contract.schema'

const contractSummaryInclude = Prisma.validator<Prisma.ContractInclude>()({
        jobPost: {
                select: {
                        id: true,
                        title: true,
                        status: true,
                        paymentMode: true,
                        budgetAmount: true,
                        budgetCurrency: true
                }
        },
        client: {
                select: {
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
                }
        },
        freelancer: {
                select: {
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
                }
        }
})

const contractDetailInclude = Prisma.validator<Prisma.ContractInclude>()({
        ...contractSummaryInclude,
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

const serializeJobPost = (jobPost: ContractSummaryPayload['jobPost']) => {
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
                jobPost: serializeJobPost(contract.jobPost),
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
