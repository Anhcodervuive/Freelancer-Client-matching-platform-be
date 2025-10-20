import { Prisma, ChatAdminAction, ChatThreadType, DisputeStatus } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { AdminDisputeListQueryInput, AdminJoinDisputeInput } from '~/schema/dispute.schema'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'

const MEDIATION_RESPONSE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000
const MEDIATION_STATUSES: DisputeStatus[] = [DisputeStatus.OPEN, DisputeStatus.NEGOTIATION]

const isMediationStatus = (status: DisputeStatus) =>
    status === DisputeStatus.OPEN || status === DisputeStatus.NEGOTIATION

const adminDisputeInclude = Prisma.validator<Prisma.DisputeInclude>()({
    latestProposal: true,
    escrow: {
        select: {
            id: true,
            status: true,
            currency: true,
            amountFunded: true,
            amountReleased: true,
            amountRefunded: true,
            milestone: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    amount: true,
                    currency: true,
                    startAt: true,
                    endAt: true,
                    contractId: true,
                    contract: {
                        select: {
                            id: true,
                            title: true,
                            clientId: true,
                            freelancerId: true,
                            client: {
                                select: {
                                    profile: {
                                        select: {
                                            firstName: true,
                                            lastName: true
                                        }
                                    }
                                }
                            },
                            freelancer: {
                                select: {
                                    profile: {
                                        select: {
                                            firstName: true,
                                            lastName: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    chatAccessLogs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
            id: true,
            adminId: true,
            action: true,
            reason: true,
            metadata: true,
            createdAt: true,
            admin: {
                select: {
                    id: true,
                    email: true,
                    profile: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            }
        }
    },
    _count: {
        select: {
            negotiations: true
        }
    }
})

type AdminDisputeRecord = Prisma.DisputeGetPayload<{ include: typeof adminDisputeInclude }>
type AdminDisputeEscrow = NonNullable<AdminDisputeRecord['escrow']>
type AdminDisputeMilestone = NonNullable<AdminDisputeEscrow['milestone']>
type AdminDisputeContract = NonNullable<AdminDisputeMilestone['contract']>

const composeFullName = (profile?: { firstName: string | null; lastName: string | null } | null) => {
    const firstName = profile?.firstName?.trim() ?? ''
    const lastName = profile?.lastName?.trim() ?? ''
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName.length > 0 ? fullName : null
}

const serializeLatestProposal = (proposal: AdminDisputeRecord['latestProposal']) => {
    if (!proposal) {
        return null
    }

    return {
        id: proposal.id,
        disputeId: proposal.disputeId,
        proposerId: proposal.proposerId,
        counterpartyId: proposal.counterpartyId,
        status: proposal.status,
        releaseAmount: Number(proposal.releaseAmount),
        refundAmount: Number(proposal.refundAmount),
        message: proposal.message ?? null,
        respondedById: proposal.respondedById ?? null,
        respondedAt: proposal.respondedAt ?? null,
        responseMessage: proposal.responseMessage ?? null,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt
    }
}

const buildAdminDisputeResponse = (record: AdminDisputeRecord) => {
    if (!record.escrow || !record.escrow.milestone || !record.escrow.milestone.contract) {
        throw new NotFoundException('Không tìm thấy dữ liệu tranh chấp', ErrorCode.ITEM_NOT_FOUND)
    }

    const escrow = record.escrow as AdminDisputeEscrow
    const milestone = record.escrow.milestone as AdminDisputeMilestone
    const contract = milestone.contract as AdminDisputeContract

    const funded = Number(escrow.amountFunded)
    const released = Number(escrow.amountReleased)
    const refunded = Number(escrow.amountRefunded)
    const disputable = Math.max(0, funded - released - refunded)

    const latestProposal = serializeLatestProposal(record.latestProposal)
    const lastAdminLog = record.chatAccessLogs?.[0] ?? null
    const now = Date.now()

    const responseDeadline = record.responseDeadline ?? null
    const isResponseOverdue = Boolean(
        responseDeadline && responseDeadline.getTime() <= now && isMediationStatus(record.status)
    )
    const hasAdminJoined = Boolean(lastAdminLog)
    const needsAdmin = isResponseOverdue && !hasAdminJoined

    return {
        dispute: {
            id: record.id,
            escrowId: record.escrowId,
            openedById: record.openedById,
            status: record.status,
            latestProposalId: record.latestProposalId ?? null,
            proposedRelease: Number(record.proposedRelease),
            proposedRefund: Number(record.proposedRefund),
            arbFeePerParty: Number(record.arbFeePerParty),
            clientArbFeePaid: record.clientArbFeePaid,
            freelancerArbFeePaid: record.freelancerArbFeePaid,
            responseDeadline,
            arbitrationDeadline: record.arbitrationDeadline ?? null,
            decidedRelease: Number(record.decidedRelease),
            decidedRefund: Number(record.decidedRefund),
            decidedById: record.decidedById ?? null,
            note: record.note ?? null,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            latestProposal
        },
        contract: {
            id: contract.id,
            title: contract.title,
            clientId: contract.clientId,
            freelancerId: contract.freelancerId
        },
        milestone: {
            id: milestone.id,
            title: milestone.title,
            status: milestone.status,
            amount: Number(milestone.amount),
            currency: milestone.currency,
            startAt: milestone.startAt,
            endAt: milestone.endAt
        },
        parties: {
            client: {
                id: contract.clientId,
                name: composeFullName(contract.client?.profile)
            },
            freelancer: {
                id: contract.freelancerId,
                name: composeFullName(contract.freelancer?.profile)
            }
        },
        amounts: {
            currency: escrow.currency,
            funded,
            released,
            refunded,
            disputable
        },
        metrics: {
            needsAdmin,
            hasAdminJoined,
            isResponseOverdue,
            negotiationCount: record._count?.negotiations ?? 0,
            lastProposalCreatedAt: latestProposal?.createdAt ?? null,
            lastProposalRespondedAt: latestProposal?.respondedAt ?? null,
            lastAdminJoinedAt: lastAdminLog?.createdAt ?? null
        },
        admin: lastAdminLog
            ? {
                  id: lastAdminLog.adminId,
                  action: lastAdminLog.action,
                  reason: lastAdminLog.reason ?? null,
                  createdAt: lastAdminLog.createdAt,
                  name: composeFullName(lastAdminLog.admin?.profile ?? null),
                  email: lastAdminLog.admin?.email ?? null,
                  metadata: lastAdminLog.metadata ?? null
              }
            : null
    }
}

const listDisputes = async (query: AdminDisputeListQueryInput) => {
    const {
        page,
        limit,
        status,
        needsAdmin,
        contractId,
        clientId,
        freelancerId,
        search,
        createdFrom,
        createdTo
    } = query

    const skip = (page - 1) * limit
    const conditions: Prisma.DisputeWhereInput[] = [
        {
            escrow: {
                milestone: {
                    isDeleted: false
                }
            }
        }
    ]

    if (status && status.length > 0) {
        conditions.push({ status: { in: status } })
    }

    if (contractId) {
        conditions.push({
            escrow: {
                milestone: {
                    contractId
                }
            }
        })
    }

    if (clientId) {
        conditions.push({
            escrow: {
                milestone: {
                    contract: {
                        clientId
                    }
                }
            }
        })
    }

    if (freelancerId) {
        conditions.push({
            escrow: {
                milestone: {
                    contract: {
                        freelancerId
                    }
                }
            }
        })
    }

    if (createdFrom) {
        conditions.push({ createdAt: { gte: createdFrom } })
    }

    if (createdTo) {
        conditions.push({ createdAt: { lte: createdTo } })
    }

    if (search) {
        const like = search.trim()
        if (like.length > 0) {
            conditions.push({
                OR: [
                    { note: { contains: like } },
                    {
                        escrow: {
                            milestone: {
                                title: { contains: like }
                            }
                        }
                    },
                    {
                        escrow: {
                            milestone: {
                                contract: {
                                    title: { contains: like }
                                }
                            }
                        }
                    },
                    {
                        escrow: {
                            milestone: {
                                contract: {
                                    client: {
                                        profile: {
                                            firstName: { contains: like }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        escrow: {
                            milestone: {
                                contract: {
                                    client: {
                                        profile: {
                                            lastName: { contains: like }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        escrow: {
                            milestone: {
                                contract: {
                                    freelancer: {
                                        profile: {
                                            firstName: { contains: like }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        escrow: {
                            milestone: {
                                contract: {
                                    freelancer: {
                                        profile: {
                                            lastName: { contains: like }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            })
        }
    }

    if (needsAdmin === true) {
        const now = new Date()
        conditions.push({ NOT: { responseDeadline: null } })
        conditions.push({ responseDeadline: { lt: now } })
        conditions.push({ status: { in: MEDIATION_STATUSES } })
        conditions.push({ chatAccessLogs: { none: {} } })
    }

    const where: Prisma.DisputeWhereInput = conditions.length > 0 ? { AND: conditions } : {}

    const [records, total] = await Promise.all([
        prismaClient.dispute.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: adminDisputeInclude
        }),
        prismaClient.dispute.count({ where })
    ])

    const data = records.map(buildAdminDisputeResponse)

    return {
        page,
        limit,
        total,
        hasMore: skip + records.length < total,
        data
    }
}

const joinDispute = async (adminId: string, disputeId: string, payload: AdminJoinDisputeInput) => {
    const disputeRecord = await prismaClient.dispute.findUnique({
        where: { id: disputeId },
        include: {
            escrow: {
                select: {
                    id: true,
                    milestone: {
                        select: {
                            id: true,
                            contractId: true
                        }
                    }
                }
            },
            chatAccessLogs: {
                where: { adminId },
                take: 1
            }
        }
    })

    if (!disputeRecord || !disputeRecord.escrow || !disputeRecord.escrow.milestone) {
        throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
    }

    if (!isMediationStatus(disputeRecord.status)) {
        throw new BadRequestException('Tranh chấp không còn ở giai đoạn hòa giải', ErrorCode.PARAM_QUERY_ERROR)
    }

    const now = new Date()

    if (!disputeRecord.responseDeadline || disputeRecord.responseDeadline > now) {
        throw new BadRequestException('Tranh chấp chưa hết hạn thương lượng trực tiếp', ErrorCode.PARAM_QUERY_ERROR)
    }

    if (disputeRecord.chatAccessLogs.length > 0) {
        throw new BadRequestException('Bạn đã tham gia tranh chấp này trước đó', ErrorCode.PARAM_QUERY_ERROR)
    }

    const mediationDeadline = new Date(now.getTime() + MEDIATION_RESPONSE_WINDOW_MS)

    const thread = await prismaClient.chatThread.findFirst({
        where: {
            contractId: disputeRecord.escrow.milestone.contractId,
            type: ChatThreadType.PROJECT
        },
        select: { id: true }
    })

    if (!thread) {
        throw new BadRequestException('Không tìm thấy phòng chat tranh chấp để admin tham gia', ErrorCode.PARAM_QUERY_ERROR)
    }

    await prismaClient.$transaction(async tx => {
        await tx.dispute.update({
            where: { id: disputeId },
            data: {
                status: DisputeStatus.NEGOTIATION,
                responseDeadline: mediationDeadline
            }
        })

        await tx.chatAdminAccessLog.create({
            data: {
                threadId: thread.id,
                adminId,
                disputeId,
                action: ChatAdminAction.VIEW_THREAD,
                reason: payload.reason ?? null,
                metadata: {
                    joinedAt: now.toISOString(),
                    stage: 'mediation'
                }
            }
        })
    })

    const refreshed = await prismaClient.dispute.findUnique({
        where: { id: disputeId },
        include: adminDisputeInclude
    })

    if (!refreshed) {
        throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
    }

    return buildAdminDisputeResponse(refreshed)
}

const adminDisputeService = {
    listDisputes,
    joinDispute
}

export default adminDisputeService
