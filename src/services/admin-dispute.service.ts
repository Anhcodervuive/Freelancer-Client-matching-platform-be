import { createHash } from 'node:crypto'

import {
    Prisma,
    ChatAdminAction,
    ChatThreadType,
    DisputeStatus,
    Role,
    ArbitrationDossierStatus,
    ArbitrationEvidenceSourceType
} from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import {
    AdminDisputeListQueryInput,
    AdminJoinDisputeInput,
    AdminRequestArbitrationFeesInput,
    AdminLockDisputeInput,
    AdminGenerateArbitrationDossierInput
} from '~/schema/dispute.schema'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'

const MEDIATION_RESPONSE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000
const MEDIATION_STATUSES: DisputeStatus[] = [DisputeStatus.OPEN, DisputeStatus.NEGOTIATION]

const isMediationStatus = (status: DisputeStatus) =>
    status === DisputeStatus.OPEN || status === DisputeStatus.NEGOTIATION

const adminDisputeUserSelect = Prisma.validator<Prisma.UserSelect>()({
    id: true,
    email: true,
    profile: {
        select: {
            firstName: true,
            lastName: true
        }
    }
})

const adminDisputeChatAccessLogSelect = Prisma.validator<Prisma.ChatAdminAccessLogSelect>()({
    id: true,
    threadId: true,
    disputeId: true,
    adminId: true,
    action: true,
    reason: true,
    metadata: true,
    createdAt: true,
    admin: {
        select: adminDisputeUserSelect
    }
})

const adminEvidenceItemInclude = Prisma.validator<Prisma.ArbitrationEvidenceItemInclude>()({
    asset: {
        select: {
            id: true,
            url: true,
            mimeType: true,
            bytes: true,
            status: true,
            checksum: true
        }
    }
})

const adminEvidenceSubmissionInclude = Prisma.validator<Prisma.ArbitrationEvidenceSubmissionInclude>()({
    submittedBy: {
        select: adminDisputeUserSelect
    },
    items: {
        include: adminEvidenceItemInclude,
        orderBy: { createdAt: 'asc' }
    }
})

const adminDossierInclude = Prisma.validator<Prisma.ArbitrationDossierInclude>()({
    generatedBy: {
        select: adminDisputeUserSelect
    }
})

const adminMilestoneEvidenceAttachmentSelect = Prisma.validator<Prisma.MilestoneSubmissionAttachmentSelect>()({
    id: true,
    submissionId: true,
    assetId: true,
    url: true,
    name: true,
    mimeType: true,
    size: true,
    createdAt: true,
    submission: {
        select: {
            id: true,
            milestoneId: true,
            freelancerId: true,
            createdAt: true,
            milestone: {
                select: {
                    id: true,
                    title: true
                }
            }
        }
    },
    asset: {
        select: {
            id: true,
            url: true,
            mimeType: true,
            bytes: true,
            status: true,
            checksum: true
        }
    }
})

const adminChatEvidenceAttachmentSelect = Prisma.validator<Prisma.ChatMessageAttachmentSelect>()({
    id: true,
    messageId: true,
    assetId: true,
    url: true,
    name: true,
    mimeType: true,
    size: true,
    createdAt: true,
    message: {
        select: {
            id: true,
            senderId: true,
            sentAt: true,
            body: true
        }
    },
    asset: {
        select: {
            id: true,
            url: true,
            mimeType: true,
            bytes: true,
            status: true,
            checksum: true
        }
    }
})

const adminEvidenceAssetSelect = Prisma.validator<Prisma.AssetSelect>()({
    id: true,
    url: true,
    mimeType: true,
    bytes: true,
    status: true,
    checksum: true,
    createdAt: true
})

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
    lockedBy: {
        select: adminDisputeUserSelect
    },
    arbitrationDossiers: {
        orderBy: { version: 'desc' },
        take: 5,
        include: adminDossierInclude
    },
    chatAccessLogs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: adminDisputeChatAccessLogSelect
    },
    _count: {
        select: {
            negotiations: true
        }
    }
})

const adminDisputeNegotiationInclude = Prisma.validator<Prisma.DisputeNegotiationInclude>()({
    proposer: {
        select: adminDisputeUserSelect
    },
    counterparty: {
        select: adminDisputeUserSelect
    },
    respondedBy: {
        select: adminDisputeUserSelect
    }
})

const adminDisputeDetailInclude = Prisma.validator<Prisma.DisputeInclude>()({
    ...adminDisputeInclude,
    chatAccessLogs: {
        orderBy: { createdAt: 'desc' },
        select: adminDisputeChatAccessLogSelect
    },
    negotiations: {
        orderBy: { createdAt: 'desc' },
        include: adminDisputeNegotiationInclude
    },
    evidenceSubmissions: {
        include: adminEvidenceSubmissionInclude,
        orderBy: { submittedAt: 'asc' }
    },
    arbitrationDossiers: {
        orderBy: { version: 'desc' },
        include: adminDossierInclude
    }
})

type AdminDisputeRecord = Prisma.DisputeGetPayload<{ include: typeof adminDisputeInclude }>
type AdminDisputeDetailRecord = Prisma.DisputeGetPayload<{ include: typeof adminDisputeDetailInclude }>
type AdminDisputeEscrow = NonNullable<AdminDisputeRecord['escrow']>
type AdminDisputeMilestone = NonNullable<AdminDisputeEscrow['milestone']>
type AdminDisputeContract = NonNullable<AdminDisputeMilestone['contract']>
type AdminDisputeUser = Prisma.UserGetPayload<{ select: typeof adminDisputeUserSelect }>
type AdminDisputeChatLog = Prisma.ChatAdminAccessLogGetPayload<{ select: typeof adminDisputeChatAccessLogSelect }>
type AdminDisputeNegotiation = Prisma.DisputeNegotiationGetPayload<{ include: typeof adminDisputeNegotiationInclude }>
type AdminEvidenceSubmission = Prisma.ArbitrationEvidenceSubmissionGetPayload<{ include: typeof adminEvidenceSubmissionInclude }>
type AdminEvidenceItem = Prisma.ArbitrationEvidenceItemGetPayload<{ include: typeof adminEvidenceItemInclude }>
type AdminArbitrationDossier = Prisma.ArbitrationDossierGetPayload<{ include: typeof adminDossierInclude }>
type AssetSummaryLike = {
    id: string
    url: string | null
    mimeType: string | null
    bytes: number | null
    status: string | null
    checksum?: string | null
}
type AdminMilestoneEvidenceAttachment = Prisma.MilestoneSubmissionAttachmentGetPayload<{ select: typeof adminMilestoneEvidenceAttachmentSelect }>
type AdminChatEvidenceAttachment = Prisma.ChatMessageAttachmentGetPayload<{ select: typeof adminChatEvidenceAttachmentSelect }>
type AdminEvidenceAsset = Prisma.AssetGetPayload<{ select: typeof adminEvidenceAssetSelect }>

const composeFullName = (profile?: { firstName: string | null; lastName: string | null } | null) => {
    const firstName = profile?.firstName?.trim() ?? ''
    const lastName = profile?.lastName?.trim() ?? ''
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName.length > 0 ? fullName : null
}

const composeUserSummary = (user?: AdminDisputeUser | null) => {
    if (!user) {
        return null
    }

    return {
        id: user.id,
        name: composeFullName(user.profile)
    }
}

const composeAssetSummary = (asset?: AssetSummaryLike | null) => {
    if (!asset) {
        return null
    }

    return {
        id: asset.id,
        url: asset.url ?? null,
        mimeType: asset.mimeType ?? null,
        bytes: asset.bytes ?? null,
        status: asset.status ?? null,
        checksum: asset.checksum ?? null
    }
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

const serializeNegotiationDetail = (negotiation: AdminDisputeNegotiation) => ({
    id: negotiation.id,
    disputeId: negotiation.disputeId,
    proposerId: negotiation.proposerId,
    counterpartyId: negotiation.counterpartyId,
    status: negotiation.status,
    releaseAmount: Number(negotiation.releaseAmount),
    refundAmount: Number(negotiation.refundAmount),
    message: negotiation.message ?? null,
    respondedById: negotiation.respondedById ?? null,
    respondedAt: negotiation.respondedAt ?? null,
    responseMessage: negotiation.responseMessage ?? null,
    createdAt: negotiation.createdAt,
    updatedAt: negotiation.updatedAt,
    proposer: composeUserSummary(negotiation.proposer),
    counterparty: composeUserSummary(negotiation.counterparty),
    respondedBy: composeUserSummary(negotiation.respondedBy ?? null)
})

const serializeAdminEvidenceItem = (item: AdminEvidenceItem) => ({
    id: item.id,
    submissionId: item.submissionId,
    label: item.label ?? null,
    description: item.description ?? null,
    sourceType: item.sourceType,
    sourceId: item.sourceId ?? null,
    url: item.url ?? null,
    assetId: item.assetId ?? null,
    createdAt: item.createdAt,
    asset: item.asset
        ? {
              id: item.asset.id,
              url: item.asset.url ?? null,
              mimeType: item.asset.mimeType ?? null,
              bytes: item.asset.bytes ?? null,
              status: item.asset.status
          }
        : null
})

const serializeAdminEvidenceSubmission = (submission: AdminEvidenceSubmission) => ({
    id: submission.id,
    disputeId: submission.disputeId,
    submittedById: submission.submittedById,
    statement: submission.statement ?? null,
    noAdditionalEvidence: submission.noAdditionalEvidence,
    submittedAt: submission.submittedAt,
    updatedAt: submission.updatedAt,
    submittedBy: composeUserSummary(submission.submittedBy),
    items: submission.items.map(serializeAdminEvidenceItem)
})

const serializeAdminDossier = (dossier: AdminArbitrationDossier) => ({
    id: dossier.id,
    disputeId: dossier.disputeId,
    version: dossier.version,
    status: dossier.status,
    generatedAt: dossier.generatedAt,
    lockedAt: dossier.lockedAt ?? null,
    finalizedAt: dossier.finalizedAt ?? null,
    hash: dossier.hash ?? null,
    notes: dossier.notes ?? null,
    generatedBy: composeUserSummary(dossier.generatedBy)
})

const serializeAdminChatLog = (log: AdminDisputeChatLog) => ({
    id: log.id,
    disputeId: log.disputeId ?? null,
    threadId: log.threadId,
    adminId: log.adminId,
    action: log.action,
    reason: log.reason ?? null,
    metadata: log.metadata ?? null,
    createdAt: log.createdAt,
    admin: {
        id: log.admin.id,
        email: log.admin.email,
        name: composeFullName(log.admin.profile)
    }
})

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
            lockedAt: record.lockedAt ?? null,
            lockedById: record.lockedById ?? null,
            currentDossierVersion: record.currentDossierVersion ?? null,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            latestProposal,
            lockedBy: composeUserSummary(record.lockedBy)
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

const buildAdminDisputeDetailResponse = (record: AdminDisputeDetailRecord) => {
    const summary = buildAdminDisputeResponse(record)

    return {
        ...summary,
        negotiations: record.negotiations.map(serializeNegotiationDetail),
        chatAccessLogs: record.chatAccessLogs.map(serializeAdminChatLog),
        evidenceSubmissions: record.evidenceSubmissions?.map(serializeAdminEvidenceSubmission) ?? [],
        arbitrationDossiers: record.arbitrationDossiers?.map(serializeAdminDossier) ?? []
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

const getDispute = async (disputeId: string) => {
    const disputeRecord = await prismaClient.dispute.findFirst({
        where: {
            id: disputeId,
            escrow: {
                milestone: {
                    isDeleted: false
                }
            }
        },
        include: adminDisputeDetailInclude
    })

    if (!disputeRecord) {
        throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
    }

    return buildAdminDisputeDetailResponse(disputeRecord)
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
    const joinedAt = now.toISOString()

    if (!disputeRecord.responseDeadline || disputeRecord.responseDeadline > now) {
        throw new BadRequestException('Tranh chấp chưa hết hạn thương lượng trực tiếp', ErrorCode.PARAM_QUERY_ERROR)
    }

    if (disputeRecord.chatAccessLogs.length > 0) {
        throw new BadRequestException('Bạn đã tham gia tranh chấp này trước đó', ErrorCode.PARAM_QUERY_ERROR)
    }

    const mediationDeadline = new Date(now.getTime() + MEDIATION_RESPONSE_WINDOW_MS)
    const joinReason = payload.reason ?? null
    const adminJoinMetadata: Prisma.JsonObject = {
        joinedAt,
        stage: 'mediation',
        disputeId,
        ...(joinReason ? { reason: joinReason } : {})
    }

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

        await tx.chatParticipant.upsert({
            where: {
                threadId_userId: {
                    threadId: thread.id,
                    userId: adminId
                }
            },
            create: {
                threadId: thread.id,
                userId: adminId,
                role: Role.ADMIN,
                metadata: adminJoinMetadata
            },
            update: {
                leftAt: null,
                metadata: adminJoinMetadata
            }
        })

        await tx.chatAdminAccessLog.create({
            data: {
                threadId: thread.id,
                adminId,
                disputeId,
                action: ChatAdminAction.VIEW_THREAD,
                reason: joinReason,
                metadata: {
                    joinedAt,
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

const requestArbitrationFees = async (
    adminId: string,
    disputeId: string,
    payload: AdminRequestArbitrationFeesInput
) => {
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

    if (disputeRecord.status !== DisputeStatus.NEGOTIATION) {
        throw new BadRequestException(
            'Tranh chấp chưa ở giai đoạn cần yêu cầu đóng phí trọng tài',
            ErrorCode.PARAM_QUERY_ERROR
        )
    }

    if (disputeRecord.chatAccessLogs.length === 0) {
        throw new BadRequestException(
            'Bạn cần tham gia tranh chấp trước khi yêu cầu đóng phí trọng tài',
            ErrorCode.PARAM_QUERY_ERROR
        )
    }

    const now = Date.now()
    const deadlineMs = Math.max(payload.deadlineDays, 1) * 24 * 60 * 60 * 1000
    const arbitrationDeadline = new Date(now + deadlineMs)

    const updated = await prismaClient.dispute.update({
        where: { id: disputeId },
        data: {
            status: DisputeStatus.AWAITING_ARBITRATION_FEES,
            arbitrationDeadline,
            responseDeadline: null,
            clientArbFeePaid: false,
            freelancerArbFeePaid: false
        },
        include: adminDisputeInclude
    })

    return buildAdminDisputeResponse(updated)
}

const lockDispute = async (adminId: string, disputeId: string, payload: AdminLockDisputeInput) => {
    const disputeRecord = await prismaClient.dispute.findUnique({
        where: { id: disputeId },
        include: {
            escrow: {
                select: {
                    id: true,
                    milestone: {
                        select: {
                            id: true,
                            contractId: true,
                            contract: {
                                select: {
                                    clientId: true,
                                    freelancerId: true
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    if (!disputeRecord || !disputeRecord.escrow || !disputeRecord.escrow.milestone || !disputeRecord.escrow.milestone.contract) {
        throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
    }

    if (disputeRecord.status !== DisputeStatus.ARBITRATION_READY) {
        throw new BadRequestException(
            'Tranh chấp chưa sẵn sàng để khóa hồ sơ trọng tài',
            ErrorCode.PARAM_QUERY_ERROR
        )
    }

    if (!disputeRecord.clientArbFeePaid || !disputeRecord.freelancerArbFeePaid) {
        throw new BadRequestException('Cả hai bên cần hoàn tất phí trọng tài trước khi khóa hồ sơ', ErrorCode.PARAM_QUERY_ERROR)
    }

    if (disputeRecord.lockedAt) {
        throw new BadRequestException('Tranh chấp đã được khóa trước đó', ErrorCode.PARAM_QUERY_ERROR)
    }

    const contract = disputeRecord.escrow.milestone.contract

    const submissions = await prismaClient.arbitrationEvidenceSubmission.findMany({
        where: { disputeId },
        select: { submittedById: true }
    })

    const submitted = new Set(submissions.map(item => item.submittedById))

    if (!submitted.has(contract.clientId) || !submitted.has(contract.freelancerId)) {
        throw new BadRequestException(
            'Client và freelancer cần xác nhận bước nộp bằng chứng cuối cùng trước khi khóa hồ sơ',
            ErrorCode.PARAM_QUERY_ERROR
        )
    }

    const updateData: Prisma.DisputeUpdateInput = {
        lockedAt: new Date(),
        lockedBy: { connect: { id: adminId } }
    }

    if (payload.note !== undefined) {
        const trimmed = payload.note.trim()
        updateData.note = trimmed.length > 0 ? trimmed : null
    }

    const updated = await prismaClient.dispute.update({
        where: { id: disputeId },
        data: updateData,
        include: adminDisputeDetailInclude
    })

    return buildAdminDisputeDetailResponse(updated)
}

const generateArbitrationDossier = async (
    adminId: string,
    disputeId: string,
    payload: AdminGenerateArbitrationDossierInput
) => {
    const disputeRecord = await prismaClient.dispute.findUnique({
        where: { id: disputeId },
        include: adminDisputeDetailInclude
    })

    if (!disputeRecord || !disputeRecord.escrow || !disputeRecord.escrow.milestone || !disputeRecord.escrow.milestone.contract) {
        throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
    }

    if (!disputeRecord.lockedAt) {
        throw new BadRequestException('Cần khóa hồ sơ trước khi tổng hợp tài liệu trọng tài', ErrorCode.PARAM_QUERY_ERROR)
    }

    const escrow = disputeRecord.escrow as AdminDisputeEscrow
    const milestone = escrow.milestone as AdminDisputeMilestone
    const contract = milestone.contract as AdminDisputeContract
    const evidenceSubmissions = disputeRecord.evidenceSubmissions ?? []

    const milestoneAttachmentIds = Array.from(
        new Set(
            evidenceSubmissions.flatMap(submission =>
                submission.items
                    .filter(item => item.sourceType === ArbitrationEvidenceSourceType.MILESTONE_ATTACHMENT && item.sourceId)
                    .map(item => item.sourceId as string)
            )
        )
    )

    const chatAttachmentIds = Array.from(
        new Set(
            evidenceSubmissions.flatMap(submission =>
                submission.items
                    .filter(item => item.sourceType === ArbitrationEvidenceSourceType.CHAT_ATTACHMENT && item.sourceId)
                    .map(item => item.sourceId as string)
            )
        )
    )

    const assetIds = new Set<string>()
    evidenceSubmissions.forEach(submission => {
        submission.items.forEach(item => {
            if (item.assetId) {
                assetIds.add(item.assetId)
            }
        })
    })

    const milestoneAttachments: AdminMilestoneEvidenceAttachment[] = milestoneAttachmentIds.length > 0
        ? await prismaClient.milestoneSubmissionAttachment.findMany({
              where: { id: { in: milestoneAttachmentIds } },
              select: adminMilestoneEvidenceAttachmentSelect
          })
        : []

    const chatAttachments: AdminChatEvidenceAttachment[] = chatAttachmentIds.length > 0
        ? await prismaClient.chatMessageAttachment.findMany({
              where: { id: { in: chatAttachmentIds } },
              select: adminChatEvidenceAttachmentSelect
          })
        : []

    milestoneAttachments.forEach(attachment => {
        if (attachment.assetId) {
            assetIds.add(attachment.assetId)
        }
    })
    chatAttachments.forEach(attachment => {
        if (attachment.assetId) {
            assetIds.add(attachment.assetId)
        }
    })

    const assetRecords: AdminEvidenceAsset[] = assetIds.size
        ? await prismaClient.asset.findMany({
              where: { id: { in: Array.from(assetIds) } },
              select: adminEvidenceAssetSelect
          })
        : []

    const milestoneAttachmentMap = new Map(milestoneAttachments.map(attachment => [attachment.id, attachment]))
    const chatAttachmentMap = new Map(chatAttachments.map(attachment => [attachment.id, attachment]))
    const assetMap = new Map(assetRecords.map(asset => [asset.id, asset]))

    const dossierStatus = payload.finalize ? ArbitrationDossierStatus.FINALIZED : ArbitrationDossierStatus.LOCKED
    const notes = payload.notes?.trim() ?? null
    const nextVersion = (disputeRecord.currentDossierVersion ?? 0) + 1

    await prismaClient.$transaction(async tx => {
        const created = await tx.arbitrationDossier.create({
            data: {
                disputeId,
                version: nextVersion,
                status: dossierStatus,
                generatedById: adminId,
                notes: notes && notes.length > 0 ? notes : null,
                payload: Prisma.JsonNull
            }
        })

        const timelineEntries: { at: Date; actor: string | null; action: string; details?: string | null }[] = []
        timelineEntries.push({ at: disputeRecord.createdAt, actor: disputeRecord.openedById, action: 'DISPUTE_OPENED' })

        const negotiationsAsc = [...(disputeRecord.negotiations ?? [])].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        )

        negotiationsAsc.forEach(negotiation => {
            timelineEntries.push({
                at: negotiation.createdAt,
                actor: negotiation.proposerId,
                action: 'NEGOTIATION_PROPOSAL',
                details: `Release ${Number(negotiation.releaseAmount)} • Refund ${Number(negotiation.refundAmount)}`
            })

            if (negotiation.respondedAt) {
                timelineEntries.push({
                    at: negotiation.respondedAt,
                    actor: negotiation.respondedById ?? null,
                    action: `NEGOTIATION_${negotiation.status}`,
                    details: negotiation.responseMessage ?? null
                })
            }
        })

        evidenceSubmissions
            .slice()
            .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())
            .forEach(submission => {
                timelineEntries.push({
                    at: submission.submittedAt,
                    actor: submission.submittedById,
                    action: 'EVIDENCE_SUBMITTED',
                    details: submission.statement ?? (submission.noAdditionalEvidence ? 'No additional evidence' : null)
                })
            })

        if (disputeRecord.lockedAt) {
            timelineEntries.push({
                at: disputeRecord.lockedAt,
                actor: disputeRecord.lockedById ?? null,
                action: 'DOSSIER_LOCKED'
            })
        }

        timelineEntries.push({
            at: created.generatedAt,
            actor: adminId,
            action: 'DOSSIER_GENERATED',
            details: `Version ${nextVersion}`
        })

        timelineEntries.sort((a, b) => a.at.getTime() - b.at.getTime())

        const evidencePayload = evidenceSubmissions.map(submission => {
            const evidenceItems = submission.items.map(item => {
                const baseAsset = item.asset ?? (item.assetId ? assetMap.get(item.assetId) ?? null : null)
                const assetSummary = composeAssetSummary(baseAsset ?? null)

                let reference: Record<string, unknown> | null = null

                if (item.sourceType === ArbitrationEvidenceSourceType.MILESTONE_ATTACHMENT && item.sourceId) {
                    const attachment = milestoneAttachmentMap.get(item.sourceId)
                    if (attachment) {
                        const attachmentAsset = attachment.asset ?? (attachment.assetId ? assetMap.get(attachment.assetId) ?? null : null)
                        reference = {
                            type: 'MILESTONE_ATTACHMENT',
                            attachment: {
                                id: attachment.id,
                                submissionId: attachment.submissionId,
                                name: attachment.name ?? null,
                                url: attachment.url ?? attachmentAsset?.url ?? null,
                                mimeType: attachment.mimeType ?? attachmentAsset?.mimeType ?? null,
                                size: attachment.size ?? attachmentAsset?.bytes ?? null,
                                createdAt: attachment.createdAt.toISOString(),
                                submission: attachment.submission
                                    ? {
                                          id: attachment.submission.id,
                                          milestoneId: attachment.submission.milestoneId,
                                          milestoneTitle: attachment.submission.milestone?.title ?? null,
                                          freelancerId: attachment.submission.freelancerId,
                                          createdAt: attachment.submission.createdAt.toISOString()
                                      }
                                    : null
                            }
                        }
                    }
                } else if (item.sourceType === ArbitrationEvidenceSourceType.CHAT_ATTACHMENT && item.sourceId) {
                    const attachment = chatAttachmentMap.get(item.sourceId)
                    if (attachment) {
                        const attachmentAsset = attachment.asset ?? (attachment.assetId ? assetMap.get(attachment.assetId) ?? null : null)
                        reference = {
                            type: 'CHAT_ATTACHMENT',
                            attachment: {
                                id: attachment.id,
                                messageId: attachment.messageId,
                                name: attachment.name ?? null,
                                url: attachment.url ?? attachmentAsset?.url ?? null,
                                mimeType: attachment.mimeType ?? attachmentAsset?.mimeType ?? null,
                                size: attachment.size ?? attachmentAsset?.bytes ?? null,
                                createdAt: attachment.createdAt.toISOString(),
                                message: attachment.message
                                    ? {
                                          id: attachment.message.id,
                                          senderId: attachment.message.senderId ?? null,
                                          sentAt: attachment.message.sentAt.toISOString(),
                                          body: attachment.message.body ?? null
                                      }
                                    : null
                            }
                        }
                    }
                } else if (item.sourceType === ArbitrationEvidenceSourceType.ASSET && item.assetId) {
                    const asset = assetMap.get(item.assetId)
                    if (asset) {
                        reference = {
                            type: 'ASSET',
                            asset: composeAssetSummary(asset)
                        }
                    }
                } else if (item.sourceType === ArbitrationEvidenceSourceType.EXTERNAL_URL && item.url) {
                    reference = { type: 'EXTERNAL_URL', url: item.url }
                }

                return {
                    id: item.id,
                    label: item.label ?? null,
                    description: item.description ?? null,
                    sourceType: item.sourceType,
                    sourceId: item.sourceId ?? null,
                    url: item.url ?? null,
                    createdAt: item.createdAt.toISOString(),
                    asset: assetSummary,
                    reference
                }
            })

            return {
                id: submission.id,
                submittedById: submission.submittedById,
                submittedBy: composeUserSummary(submission.submittedBy),
                statement: submission.statement ?? null,
                noAdditionalEvidence: submission.noAdditionalEvidence,
                submittedAt: submission.submittedAt.toISOString(),
                items: evidenceItems
            }
        })

        const funded = Number(escrow.amountFunded)
        const released = Number(escrow.amountReleased)
        const refunded = Number(escrow.amountRefunded)

        const payloadData: Record<string, unknown> = {
            meta: {
                dossierId: created.id,
                disputeId,
                status: disputeRecord.status,
                dossierStatus,
                dossierVersion: nextVersion,
                generatedAt: created.generatedAt.toISOString(),
                generatedBy: adminId,
                lockedAt: disputeRecord.lockedAt?.toISOString() ?? null,
                notes: notes && notes.length > 0 ? notes : null,
                hash: null
            },
            parties: [
                {
                    role: 'CLIENT',
                    userId: contract.clientId,
                    displayName: composeFullName(contract.client?.profile) ?? null,
                    feePaid: disputeRecord.clientArbFeePaid
                },
                {
                    role: 'FREELANCER',
                    userId: contract.freelancerId,
                    displayName: composeFullName(contract.freelancer?.profile) ?? null,
                    feePaid: disputeRecord.freelancerArbFeePaid
                },
                {
                    role: 'ARBITRATION_OFFICER',
                    userId: adminId,
                    displayName: null,
                    feePaid: null
                }
            ],
            financials: {
                escrowAmount: funded,
                currency: escrow.currency,
                released,
                refunded,
                disputed: Math.max(0, funded - released - refunded),
                requested: {
                    client: Number(disputeRecord.proposedRefund),
                    freelancer: Number(disputeRecord.proposedRelease)
                },
                decided: {
                    client: Number(disputeRecord.decidedRefund),
                    freelancer: Number(disputeRecord.decidedRelease)
                }
            },
            timeline: timelineEntries.map(entry => ({
                at: entry.at.toISOString(),
                actor: entry.actor,
                action: entry.action,
                details: entry.details ?? null
            })),
            evidence: evidencePayload
        }

        const hash = createHash('sha256').update(JSON.stringify(payloadData)).digest('hex')
        ;(payloadData.meta as Record<string, unknown>).hash = hash

        const updated = await tx.arbitrationDossier.update({
            where: { id: created.id },
            data: {
                payload: payloadData,
                hash,
                status: dossierStatus
            },
            include: adminDossierInclude
        })

        await tx.dispute.update({
            where: { id: disputeId },
            data: { currentDossierVersion: nextVersion }
        })

        return updated
    })

    const refreshed = await prismaClient.dispute.findUnique({
        where: { id: disputeId },
        include: adminDisputeDetailInclude
    })

    if (!refreshed) {
        throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
    }

    return buildAdminDisputeDetailResponse(refreshed)
}

const adminDisputeService = {
    listDisputes,
    getDispute,
    joinDispute,
    requestArbitrationFees,
    lockDispute,
    generateArbitrationDossier
}

export default adminDisputeService
