import { Prisma, JobProposalStatus } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { JobProposalFilterInput } from '~/schema/job-proposal.schema'
import { jobProposalInclude, serializeJobProposal } from '~/services/job-proposal/shared'

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

const ensureClientUser = async (userId: string) => {
        const client = await prismaClient.client.findUnique({
                where: { userId },
                select: { userId: true }
        })

        if (!client) {
                throw new UnauthorizedException('Chỉ client mới có thể xem proposal', ErrorCode.USER_NOT_AUTHORITY)
        }

        return client
}

const ensureJobOwnedByClient = async (jobId: string, clientId: string) => {
        const job = await prismaClient.jobPost.findUnique({
                where: { id: jobId },
                select: {
                        id: true,
                        clientId: true,
                        isDeleted: true
                }
        })

        if (!job || job.isDeleted || job.clientId !== clientId) {
                throw new NotFoundException('Công việc không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return job
}

const normalizeStatuses = (filters: JobProposalFilterInput): JobProposalStatus[] | undefined => {
        const statuses: JobProposalStatus[] = []
        if (filters.status) {
                statuses.push(filters.status)
        }
        if (filters.statuses) {
                for (const status of filters.statuses) {
                        statuses.push(status)
                }
        }
        const unique = uniquePreserveOrder(statuses)
        return unique.length > 0 ? unique : undefined
}

const listJobProposalsForJob = async (clientUserId: string, jobId: string, filters: JobProposalFilterInput) => {
        await ensureClientUser(clientUserId)
        await ensureJobOwnedByClient(jobId, clientUserId)

        const page = filters.page
        const limit = filters.limit
        const statuses = normalizeStatuses(filters)

        const andConditions: Prisma.JobProposalWhereInput[] = []

        if (filters.submittedFrom || filters.submittedTo) {
                andConditions.push({
                        submittedAt: {
                                ...(filters.submittedFrom ? { gte: filters.submittedFrom } : {}),
                                ...(filters.submittedTo ? { lte: filters.submittedTo } : {})
                        }
                })
        }

        if (filters.search) {
                const search = filters.search
                andConditions.push({
                        OR: [
                                {
                                        freelancer: {
                                                is: {
                                                        profile: {
                                                                is: {
                                                                        OR: [
                                                                                {
                                                                                        firstName: { contains: search }
                                                                                },
                                                                                {
                                                                                        lastName: { contains: search }
                                                                                }
                                                                        ]
                                                                }
                                                        }
                                                }
                                        }
                                },
                                {
                                        freelancer: {
                                                is: {
                                                        title: { contains: search }
                                                }
                                        }
                                },
                                { coverLetter: { contains: search } }
                        ]
                })
        }

        if (filters.freelancerId) {
                andConditions.push({ freelancerId: filters.freelancerId })
        }

        const where: Prisma.JobProposalWhereInput = {
                jobId,
                ...(statuses
                        ? {
                                  status: statuses.length === 1 ? statuses[0]! : { in: statuses }
                          }
                        : {}),
                ...(andConditions.length > 0 ? { AND: andConditions } : {})
        }

        let orderBy: Prisma.JobProposalOrderByWithRelationInput | Prisma.JobProposalOrderByWithRelationInput[] = {
                submittedAt: Prisma.SortOrder.desc
        }

        switch (filters.sortBy) {
                case 'oldest':
                        orderBy = { submittedAt: Prisma.SortOrder.asc }
                        break
                case 'bid-asc':
                        orderBy = { bidAmount: Prisma.SortOrder.asc }
                        break
                case 'bid-desc':
                        orderBy = { bidAmount: Prisma.SortOrder.desc }
                        break
                default:
                        orderBy = { submittedAt: Prisma.SortOrder.desc }
                        break
        }

        const [items, total] = await prismaClient.$transaction([
                prismaClient.jobProposal.findMany({
                        where,
                        include: jobProposalInclude,
                        orderBy,
                        skip: (page - 1) * limit,
                        take: limit
                }),
                prismaClient.jobProposal.count({ where })
        ])

        return {
                data: items.map(serializeJobProposal),
                total,
                page,
                limit
        }
}

const clientJobProposalService = {
        listJobProposalsForJob
}

export default clientJobProposalService
