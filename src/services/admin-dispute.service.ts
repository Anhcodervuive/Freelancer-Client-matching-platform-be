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
    AdminGenerateArbitrationDossierInput,
    AdminAssignArbitratorInput,
    AdminListDisputeDossiersQueryInput,
    AdminRecordArbitrationDecisionInput
} from '~/schema/dispute.schema'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ForbiddenException } from '~/exceptions/Forbidden'
import { ErrorCode } from '~/exceptions/root'
import createDossierPdf, {
    type DossierPdfContent,
    type PdfEvidenceSection,
    type PdfKeyValuePair,
    type PdfTableContent
} from '~/utils/pdf'

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

const adminEvidenceAssetSelect = Prisma.validator<Prisma.AssetSelect>()({
    id: true,
    url: true,
    mimeType: true,
    bytes: true,
    status: true,
    checksum: true,
    createdAt: true
})

const adminEvidenceItemInclude = Prisma.validator<Prisma.ArbitrationEvidenceItemInclude>()({
    asset: {
        select: adminEvidenceAssetSelect
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

const adminDecisionAttachmentInclude = Prisma.validator<Prisma.ArbitrationDecisionAttachmentInclude>()({
    asset: {
        select: adminEvidenceAssetSelect
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

const adminMilestoneSubmissionAttachmentSelect =
    Prisma.validator<Prisma.MilestoneSubmissionAttachmentSelect>()({
        id: true,
        submissionId: true,
        assetId: true,
        url: true,
        name: true,
        mimeType: true,
        size: true,
        createdAt: true,
        asset: {
            select: adminEvidenceAssetSelect
        }
    })

const adminMilestoneSubmissionInclude = Prisma.validator<Prisma.MilestoneSubmissionInclude>()({
    attachments: {
        select: adminMilestoneSubmissionAttachmentSelect,
        orderBy: { createdAt: 'asc' }
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
    },
    reviewer: {
        select: {
            profile: {
                select: {
                    firstName: true,
                    lastName: true
                }
            }
        }
    }
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
    arbitrator: {
        select: adminDisputeUserSelect
    },
    decidedBy: {
        select: adminDisputeUserSelect
    },
    decisionAttachments: {
        include: adminDecisionAttachmentInclude,
        orderBy: { createdAt: 'asc' }
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
type AdminMilestoneSubmission = Prisma.MilestoneSubmissionGetPayload<{ include: typeof adminMilestoneSubmissionInclude }>
type AdminDecisionAttachment = Prisma.ArbitrationDecisionAttachmentGetPayload<{ include: typeof adminDecisionAttachmentInclude }>
type ArbitrationTimelineEntry = {
    at: Date
    actor: string | null
    action: string
    details?: string | null
}
type PreparedArbitrationCase = {
    payload: {
        parties: unknown[]
        financials: Record<string, unknown>
        milestone: Record<string, unknown>
        milestoneSubmissions: unknown[]
        evidence: unknown[]
    }
    timelineEntries: ArbitrationTimelineEntry[]
}
type ArbitrationContextViewer = {
    role: 'ADMIN' | 'ARBITRATOR'
    userId: string
}

const composeFullName = (profile?: { firstName: string | null; lastName: string | null } | null) => {
    const firstName = profile?.firstName?.trim() ?? ''
    const lastName = profile?.lastName?.trim() ?? ''
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName.length > 0 ? fullName : null
}

const decimalToCents = (value: Prisma.Decimal) => Number(value.mul(100).toFixed(0))
const centsToDecimal = (value: number) => new Prisma.Decimal((value / 100).toFixed(2))

const composeUserSummary = (user?: AdminDisputeUser | null) => {
    if (!user) {
        return null
    }

    return {
        id: user.id,
        name: composeFullName(user.profile)
    }
}

const composeUserSummaryWithEmail = (user?: AdminDisputeUser | null) => {
    if (!user) {
        return null
    }

    return {
        id: user.id,
        name: composeFullName(user.profile),
        email: user.email
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const toDisplayValue = (value: unknown): string => {
    if (value === null || value === undefined) {
        return 'N/A'
    }

    if (typeof value === 'string') {
        return value
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value)
    }

    if (value instanceof Date) {
        return value.toISOString()
    }

    try {
        return JSON.stringify(value)
    } catch (error) {
        void error
    }

    return String(value)
}

const describeBooleanValue = (value: unknown) => {
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No'
    }

    if (value === 'true') {
        return 'Yes'
    }

    if (value === 'false') {
        return 'No'
    }

    return toDisplayValue(value)
}

const summarizeEvidenceAsset = (value: unknown) => {
    if (!isRecord(value)) {
        return null
    }

    const details: string[] = []

    if (typeof value.id === 'string' && value.id.length > 0) {
        details.push(`ID: ${value.id}`)
    }

    if (typeof value.mimeType === 'string' && value.mimeType.length > 0) {
        details.push(`MIME: ${value.mimeType}`)
    }

    if (typeof value.bytes === 'number') {
        details.push(`Size: ${value.bytes} bytes`)
    }

    if (typeof value.url === 'string' && value.url.length > 0) {
        details.push(`URL: ${value.url}`)
    }

    return details.length > 0 ? ['Asset', ...details.map(entry => `• ${entry}`)].join('\n') : null
}

const summarizeEvidenceReference = (reference: unknown) => {
    if (!isRecord(reference)) {
        return toDisplayValue(reference)
    }

    const type = typeof reference.type === 'string' ? reference.type : 'UNKNOWN'

    if (type === 'MILESTONE_ATTACHMENT' && isRecord(reference.attachment)) {
        const attachment = reference.attachment
        const details: string[] = []

        if (typeof attachment.name === 'string' && attachment.name.length > 0) {
            details.push(`Tên tệp: ${attachment.name}`)
        }

        if (typeof attachment.id === 'string' && attachment.id.length > 0) {
            details.push(`ID: ${attachment.id}`)
        }

        if (typeof attachment.url === 'string' && attachment.url.length > 0) {
            details.push(`URL: ${attachment.url}`)
        }

        if (isRecord(attachment.submission)) {
            const milestoneTitle =
                typeof attachment.submission.milestoneTitle === 'string'
                    ? attachment.submission.milestoneTitle
                    : null
            if (milestoneTitle) {
                details.push(`Milestone: ${milestoneTitle}`)
            }
        }

        return ['Milestone Attachment', ...details.map(entry => `• ${entry}`)].join('\n')
    }

    if (type === 'CHAT_ATTACHMENT' && isRecord(reference.attachment)) {
        const attachment = reference.attachment
        const details: string[] = []

        if (typeof attachment.name === 'string' && attachment.name.length > 0) {
            details.push(`Tên tệp: ${attachment.name}`)
        }

        if (typeof attachment.message === 'object' && attachment.message && !Array.isArray(attachment.message)) {
            const message = attachment.message as Record<string, unknown>
            const sender = typeof message.senderId === 'string' ? message.senderId : null
            if (sender) {
                details.push(`Người gửi: ${sender}`)
            }

            const sentAt = typeof message.sentAt === 'string' ? message.sentAt : null
            if (sentAt) {
                details.push(`Gửi lúc: ${sentAt}`)
            }
        }

        if (typeof attachment.url === 'string' && attachment.url.length > 0) {
            details.push(`URL: ${attachment.url}`)
        }

        return ['Chat Attachment', ...details.map(entry => `• ${entry}`)].join('\n')
    }

    if (type === 'ASSET' && isRecord(reference.asset)) {
        const summary = summarizeEvidenceAsset(reference.asset)
        if (summary) {
            return ['Asset Reference', summary].join('\n')
        }
        return 'Asset Reference'
    }

    if (type === 'EXTERNAL_URL' && typeof reference.url === 'string') {
        return ['External URL', `• ${reference.url}`].join('\n')
    }

    return toDisplayValue(reference)
}

const formatDateToken = (input: Date) => {
    const year = input.getUTCFullYear()
    const month = String(input.getUTCMonth() + 1).padStart(2, '0')
    const day = String(input.getUTCDate()).padStart(2, '0')
    const hours = String(input.getUTCHours()).padStart(2, '0')
    const minutes = String(input.getUTCMinutes()).padStart(2, '0')
    const seconds = String(input.getUTCSeconds()).padStart(2, '0')

    return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

const describeUserFromPayload = (user: unknown, fallbackId: unknown) => {
    if (isRecord(user)) {
        const name = typeof user.name === 'string' && user.name.trim().length > 0 ? user.name : null
        const id = typeof user.id === 'string' && user.id.trim().length > 0 ? user.id : null

        if (name && id) {
            return `${name} (${id})`
        }

        if (name) {
            return name
        }

        if (id) {
            return id
        }
    }

    return toDisplayValue(fallbackId ?? user)
}

const toKeyValuePairs = (entries: { label: string; value: unknown }[]): PdfKeyValuePair[] =>
    entries.map(entry => ({ label: entry.label, value: toDisplayValue(entry.value) }))

const buildDossierPdfContent = (dossier: AdminArbitrationDossier): DossierPdfContent => {
    const generatedByParts: string[] = []

    if (dossier.generatedBy) {
        const name = composeFullName(dossier.generatedBy.profile)

        if (name) {
            generatedByParts.push(name)
        }

        if (dossier.generatedBy.email) {
            generatedByParts.push(dossier.generatedBy.email)
        }

        generatedByParts.push(dossier.generatedBy.id)
    }

    const generatedBySummary =
        generatedByParts.length > 0 ? generatedByParts.filter(Boolean).join(' • ') : 'N/A'

    const caseOverview = toKeyValuePairs([
        { label: 'Dossier ID', value: dossier.id },
        { label: 'Dispute ID', value: dossier.disputeId },
        { label: 'Version', value: dossier.version },
        { label: 'Status', value: dossier.status },
        { label: 'Generated At', value: dossier.generatedAt },
        { label: 'Generated By', value: generatedBySummary },
        { label: 'Locked At', value: dossier.lockedAt ?? null },
        { label: 'Finalized At', value: dossier.finalizedAt ?? null },
        { label: 'Hash', value: dossier.hash ?? null },
        { label: 'Notes', value: dossier.notes ?? null }
    ])

    const baseFinancialSummary = toKeyValuePairs([
        { label: 'Currency', value: null },
        { label: 'Escrow Amount', value: null },
        { label: 'Released', value: null },
        { label: 'Refunded', value: null },
        { label: 'Disputed', value: null }
    ])

    const defaultTimelineTable: PdfTableContent = {
        columns: ['Thời gian', 'Tác nhân', 'Hành động', 'Chi tiết'],
        rows: [],
        columnRatios: [0.22, 0.2, 0.2, 0.38],
        emptyMessage: 'Không có dữ liệu timeline trong payload'
    }

    const payload = dossier.payload

    const content: DossierPdfContent = {
        disputeId: dossier.disputeId,
        status: toDisplayValue(dossier.status),
        version: dossier.version,
        generatedAt: toDisplayValue(dossier.generatedAt),
        generatedBy: generatedBySummary,
        lockedAt: dossier.lockedAt ? toDisplayValue(dossier.lockedAt) : null,
        finalizedAt: dossier.finalizedAt ? toDisplayValue(dossier.finalizedAt) : null,
        caseOverview,
        metadataOverview: null,
        parties: null,
        financialOverview: {
            summary: baseFinancialSummary,
            requested: null,
            decided: null
        },
        timeline: defaultTimelineTable,
        evidenceSections: [],
        evidenceNote: null,
        payloadSnapshot: null,
        payloadFallback: null
    }

    if (!isRecord(payload)) {
        return {
            ...content,
            metadataOverview: {
                items: null,
                note: 'Payload không phải JSON hợp lệ, hiển thị dữ liệu dạng chuỗi.'
            },
            parties: null,
            milestone: { details: null, note: 'Không có milestone trong payload' },
            milestoneSubmissions: { table: null, note: 'Không có milestone submission trong payload' },
            payloadFallback: `Payload summary: ${toDisplayValue(payload)}`
        }
    }

    const meta = isRecord(payload.meta) ? payload.meta : null
    const parties = Array.isArray(payload.parties) ? payload.parties : []
    const financials = isRecord(payload.financials) ? payload.financials : null
    const timeline = Array.isArray(payload.timeline) ? payload.timeline : []
    const evidence = Array.isArray(payload.evidence) ? payload.evidence : []
    const milestonePayload = isRecord(payload.milestone) ? payload.milestone : null
    const milestoneSubmissionsPayload = Array.isArray(payload.milestoneSubmissions)
        ? payload.milestoneSubmissions
        : []

    const metadataOverview: DossierPdfContent['metadataOverview'] = meta
        ? {
              items: toKeyValuePairs([
                  { label: 'Dossier ID', value: meta.dossierId ?? dossier.id },
                  { label: 'Dispute ID', value: meta.disputeId ?? dossier.disputeId },
                  { label: 'Dossier Status', value: meta.dossierStatus ?? dossier.status },
                  { label: 'Version', value: meta.dossierVersion ?? dossier.version },
                  { label: 'Generated At', value: meta.generatedAt ?? dossier.generatedAt },
                  { label: 'Generated By', value: meta.generatedBy ?? generatedBySummary },
                  { label: 'Locked At', value: meta.lockedAt ?? null },
                  { label: 'Notes', value: meta.notes ?? null },
                  { label: 'Hash', value: meta.hash ?? dossier.hash }
              ])
          }
        : {
              items: null,
              note: 'Không có metadata trong payload'
          }

    const partyRows = parties.map((party, index) => {
        if (isRecord(party)) {
            const role = toDisplayValue(party.role ?? `Party ${index + 1}`)
            const displayName = toDisplayValue(party.displayName ?? null)
            const userId = toDisplayValue(party.userId ?? null)
            const feePaid = describeBooleanValue(party.feePaid ?? null)

            return [`${index + 1}. ${role}`, displayName, userId, feePaid]
        }

        return [`${index + 1}`, toDisplayValue(party), 'N/A', 'N/A']
    })

    const partiesTable: PdfTableContent = {
        columns: ['Vai trò', 'Tên hiển thị', 'Mã người dùng', 'Đã đóng phí'],
        rows: partyRows,
        columnRatios: [0.24, 0.28, 0.24, 0.14],
        emptyMessage: 'Không có thông tin đối tác trong payload'
    }

    const financialSummary = financials
        ? toKeyValuePairs([
              { label: 'Currency', value: financials.currency ?? null },
              { label: 'Escrow Amount', value: financials.escrowAmount ?? null },
              { label: 'Released', value: financials.released ?? null },
              { label: 'Refunded', value: financials.refunded ?? null },
              { label: 'Disputed', value: financials.disputed ?? null }
          ])
        : baseFinancialSummary

    const requested = financials && isRecord(financials.requested) ? financials.requested : null
    const decided = financials && isRecord(financials.decided) ? financials.decided : null

    const requestedTable: PdfTableContent | null = requested
        ? {
              columns: ['Bên', 'Giá trị'],
              rows: [
                  ['Client', toDisplayValue(requested.client ?? null)],
                  ['Freelancer', toDisplayValue(requested.freelancer ?? null)]
              ],
              columnRatios: [0.4, 0.6]
          }
        : null

    const decidedTable: PdfTableContent | null = decided
        ? {
              columns: ['Bên', 'Giá trị'],
              rows: [
                  ['Client', toDisplayValue(decided.client ?? null)],
                  ['Freelancer', toDisplayValue(decided.freelancer ?? null)]
              ],
              columnRatios: [0.4, 0.6]
          }
        : null

    const milestoneSection = milestonePayload
        ? {
              details: toKeyValuePairs([
                  { label: 'Milestone ID', value: milestonePayload.id ?? null },
                  { label: 'Tiêu đề', value: milestonePayload.title ?? null },
                  { label: 'Trạng thái', value: milestonePayload.status ?? null },
                  { label: 'Giá trị', value: milestonePayload.amount ?? null },
                  { label: 'Tiền tệ', value: milestonePayload.currency ?? null },
                  { label: 'Bắt đầu', value: milestonePayload.startAt ?? null },
                  { label: 'Kết thúc', value: milestonePayload.endAt ?? null },
                  { label: 'Contract ID', value: milestonePayload.contractId ?? null },
                  { label: 'Contract Title', value: milestonePayload.contractTitle ?? null }
              ])
          }
        : {
              details: null,
              note: 'Không có milestone trong payload'
          }

    const limitedMilestoneSubmissions = milestoneSubmissionsPayload.slice(0, 12)
    const milestoneSubmissionRows = limitedMilestoneSubmissions.map((submission, index) => {
        if (isRecord(submission)) {
            const attachments = Array.isArray(submission.attachments) ? submission.attachments : []
            const limitedAttachments = attachments.slice(0, 5)
            const attachmentLines = limitedAttachments.map((attachment, attachmentIndex) => {
                if (isRecord(attachment)) {
                    const name = attachment.name ?? attachment.id ?? `Attachment ${attachmentIndex + 1}`
                    const lines = [`• ${toDisplayValue(name)}`]
                    if (attachment.url) {
                        lines.push(`  URL: ${toDisplayValue(attachment.url)}`)
                    }
                    if (attachment.mimeType) {
                        lines.push(`  MIME: ${toDisplayValue(attachment.mimeType)}`)
                    }
                    if (attachment.size !== undefined && attachment.size !== null) {
                        lines.push(`  Size: ${toDisplayValue(attachment.size)}`)
                    }
                    return lines.join('\n')
                }

                return `• ${toDisplayValue(attachment)}`
            })

            if (attachments.length > limitedAttachments.length) {
                attachmentLines.push(`• +${attachments.length - limitedAttachments.length} tệp bổ sung đã được lược bỏ`)
            }

            const submissionLines = [`ID: ${toDisplayValue(submission.id ?? null)}`]
            if (submission.message) {
                submissionLines.push(`Statement: ${toDisplayValue(submission.message)}`)
            }
            if (submission.reviewNote) {
                submissionLines.push(`Review: ${toDisplayValue(submission.reviewNote)}`)
            }

            const freelancerLines: string[] = []
            if (submission.freelancer) {
                freelancerLines.push(toDisplayValue(submission.freelancer))
            }
            if (submission.freelancerId) {
                freelancerLines.push(`ID: ${toDisplayValue(submission.freelancerId)}`)
            }

            const statusLines = [`Trạng thái: ${toDisplayValue(submission.status ?? null)}`]
            statusLines.push(`Nộp lúc: ${toDisplayValue(submission.createdAt ?? null)}`)
            if (submission.reviewedAt) {
                statusLines.push(`Duyệt lúc: ${toDisplayValue(submission.reviewedAt ?? null)}`)
            }
            if (submission.reviewedBy) {
                statusLines.push(`Người duyệt: ${toDisplayValue(submission.reviewedBy)}`)
            }
            if (submission.reviewRating !== undefined && submission.reviewRating !== null) {
                statusLines.push(`Đánh giá: ${toDisplayValue(submission.reviewRating)}`)
            }

            return [
                `${index + 1}. ${submissionLines.join('\n')}`,
                freelancerLines.length > 0 ? freelancerLines.join('\n') : 'N/A',
                statusLines.join('\n'),
                attachmentLines.length > 0 ? attachmentLines.join('\n') : 'Không có tệp'
            ]
        }

        return [`${index + 1}. ${toDisplayValue(submission)}`, 'N/A', 'N/A', 'N/A']
    })

    const milestoneSubmissionTable: PdfTableContent | null = milestoneSubmissionRows.length > 0
        ? {
              columns: ['Submission', 'Freelancer', 'Trạng thái & Thời gian', 'Đính kèm'],
              rows: milestoneSubmissionRows,
              columnRatios: [0.3, 0.2, 0.26, 0.24],
              note:
                  milestoneSubmissionsPayload.length > limitedMilestoneSubmissions.length
                      ? `${milestoneSubmissionsPayload.length - limitedMilestoneSubmissions.length} submission bổ sung đã được lược bỏ`
                      : null
          }
        : null

    const milestoneSubmissionsSection = milestoneSubmissionTable
        ? { table: milestoneSubmissionTable, note: null }
        : { table: null, note: 'Không có milestone submission trong payload' }

    const limitedTimeline = timeline.slice(0, 40)
    const timelineRows = limitedTimeline.map(entry => {
        if (isRecord(entry)) {
            const at = toDisplayValue(entry.at ?? null)
            const actor = describeUserFromPayload(entry.actor ?? null, entry.actor ?? null)
            const action = toDisplayValue(entry.action ?? null)
            const details = entry.details !== undefined ? toDisplayValue(entry.details) : ''

            return [at, actor, action, details === 'N/A' ? '' : details]
        }

        return [toDisplayValue(entry), '', '', '']
    })

    const timelineTable: PdfTableContent = {
        ...defaultTimelineTable,
        rows: timelineRows,
        note:
            timeline.length > limitedTimeline.length
                ? `${timeline.length - limitedTimeline.length} mốc bổ sung đã được lược bỏ`
                : null
    }

    const limitedEvidence = evidence.slice(0, 10)

    const evidenceSections: PdfEvidenceSection[] = limitedEvidence.map((submission, submissionIndex) => {
        const title = `Submission ${submissionIndex + 1}`

        if (isRecord(submission)) {
            const summary = toKeyValuePairs([
                { label: 'Submission ID', value: submission.id ?? null },
                {
                    label: 'Submitted By',
                    value: describeUserFromPayload(submission.submittedBy ?? null, submission.submittedById ?? null)
                },
                { label: 'Statement', value: submission.statement ?? null },
                {
                    label: 'No Additional Evidence',
                    value: describeBooleanValue(submission.noAdditionalEvidence ?? null)
                },
                { label: 'Submitted At', value: submission.submittedAt ?? null }
            ])

            const items = Array.isArray(submission.items) ? submission.items : []
            const limitedItems = items.slice(0, 15)

            const itemRows = limitedItems.map((item, itemIndex) => {
                if (isRecord(item)) {
                    const label = item.label ?? item.id ?? `Item ${itemIndex + 1}`
                    const sourceType = toDisplayValue(item.sourceType ?? null)
                    const referenceSummary = summarizeEvidenceReference(item.reference ?? null)
                    const assetSummary = summarizeEvidenceAsset(item.asset ?? null)
                    const description =
                        typeof item.description === 'string' && item.description.trim().length > 0
                            ? item.description
                            : null

                    const sourceLines = [`Loại: ${sourceType}`]
                    if (item.sourceId) {
                        sourceLines.push(`ID: ${toDisplayValue(item.sourceId)}`)
                    }
                    if (item.url) {
                        sourceLines.push(`URL: ${toDisplayValue(item.url)}`)
                    }

                    const detailSections = [
                        description ? `Mô tả: ${description}` : null,
                        referenceSummary,
                        assetSummary
                    ].filter((value): value is string => Boolean(value && value.length > 0))

                    return [
                        `${itemIndex + 1}. ${toDisplayValue(label)}`,
                        sourceLines.join('\n'),
                        detailSections.length > 0 ? detailSections.join('\n\n') : 'N/A',
                        toDisplayValue(item.createdAt ?? null)
                    ]
                }

                return [`${itemIndex + 1}`, toDisplayValue(item), 'N/A', 'N/A']
            })

            const table: PdfTableContent | null = itemRows.length > 0
                ? {
                      columns: ['Mục', 'Nguồn', 'Chi tiết', 'Thời gian'],
                      rows: itemRows,
                      columnRatios: [0.25, 0.24, 0.33, 0.18]
                  }
                : null

            const notes: string[] = []

            if (itemRows.length === 0) {
                notes.push('Không có mục bằng chứng đính kèm')
            }

            if (items.length > limitedItems.length) {
                notes.push(`${items.length - limitedItems.length} mục bổ sung đã được lược bỏ`)
            }

            return {
                title,
                summary,
                table,
                note: notes.length > 0 ? notes.join('. ') : null
            }
        }

        return {
            title,
            summary: [],
            table: null,
            note: toDisplayValue(submission)
        }
    })

    const evidenceNote =
        evidence.length > limitedEvidence.length
            ? `${evidence.length - limitedEvidence.length} submission bổ sung đã được lược bỏ`
            : null

    let payloadSnapshot: DossierPdfContent['payloadSnapshot'] = null
    let payloadFallback: string | null = null

    try {
        const jsonString = JSON.stringify(payload, null, 2)

        if (jsonString) {
            const jsonLines = jsonString.split('\n')
            const limitedJson = jsonLines.slice(0, 200)

            payloadSnapshot = {
                lines: limitedJson,
                note:
                    jsonLines.length > limitedJson.length
                        ? `${jsonLines.length - limitedJson.length} dòng bổ sung đã được lược bỏ`
                        : null
            }
        }
    } catch (error) {
        void error
        payloadFallback = 'Không thể stringify payload sang JSON'
    }

    return {
        ...content,
        metadataOverview,
        parties: partiesTable,
        financialOverview: {
            summary: financialSummary,
            requested: requestedTable,
            decided: decidedTable
        },
        milestone: milestoneSection,
        milestoneSubmissions: milestoneSubmissionsSection,
        timeline: timelineTable,
        evidenceSections,
        evidenceNote,
        payloadSnapshot,
        payloadFallback
    }
}

const listArbitrators = async () => {
    const arbitrators = await prismaClient.user.findMany({
        where: {
            role: Role.ARBITRATOR,
            isActive: true
        },
        orderBy: { createdAt: 'asc' },
        select: adminDisputeUserSelect
    })

    return arbitrators.map(user => ({
        id: user.id,
        email: user.email,
        name: composeFullName(user.profile)
    }))
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

const serializeDecisionAttachment = (attachment: AdminDecisionAttachment) => ({
    id: attachment.id,
    disputeId: attachment.disputeId,
    assetId: attachment.assetId,
    label: attachment.label ?? null,
    createdAt: attachment.createdAt,
    asset: attachment.asset
        ? {
              id: attachment.asset.id,
              url: attachment.asset.url ?? null,
              mimeType: attachment.asset.mimeType ?? null,
              bytes: attachment.asset.bytes ?? null,
              status: attachment.asset.status
          }
        : null
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

const serializeAdminDossierDetail = (dossier: AdminArbitrationDossier) => ({
    ...serializeAdminDossier(dossier),
    payload: dossier.payload ?? null
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
            arbitratorId: record.arbitratorId ?? null,
            arbitratorAssignedAt: record.arbitratorAssignedAt ?? null,
            currentDossierVersion: record.currentDossierVersion ?? null,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            latestProposal,
            lockedBy: composeUserSummary(record.lockedBy),
            arbitrator: composeUserSummaryWithEmail(record.arbitrator)
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
        decision: {
            releaseAmount: Number(record.decidedRelease),
            refundAmount: Number(record.decidedRefund),
            decidedById: record.decidedById ?? null,
            decidedAt: record.decidedAt ?? null,
            summary: record.decisionSummary ?? null,
            reasoning: record.decisionReasoning ?? null,
            decidedBy: composeUserSummaryWithEmail(record.decidedBy),
            attachments: record.decisionAttachments?.map(serializeDecisionAttachment) ?? []
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

const listDisputeDossiers = async (disputeId: string, query: AdminListDisputeDossiersQueryInput) => {
    const disputeRecord = await prismaClient.dispute.findFirst({
        where: {
            id: disputeId,
            escrow: {
                milestone: {
                    isDeleted: false
                }
            }
        },
        select: { id: true }
    })

    if (!disputeRecord) {
        throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
    }

    const { page, limit } = query
    const skip = (page - 1) * limit

    const [records, total] = await Promise.all([
        prismaClient.arbitrationDossier.findMany({
            where: { disputeId },
            orderBy: { version: 'desc' },
            skip,
            take: limit,
            include: adminDossierInclude
        }),
        prismaClient.arbitrationDossier.count({ where: { disputeId } })
    ])

    return {
        disputeId,
        page,
        limit,
        total,
        hasMore: skip + records.length < total,
        data: records.map(serializeAdminDossierDetail)
    }
}

const getDisputeDossierPdf = async (disputeId: string, dossierId: string) => {
    const dossierRecord = await prismaClient.arbitrationDossier.findFirst({
        where: { id: dossierId, disputeId },
        include: adminDossierInclude
    })

    if (!dossierRecord) {
        throw new NotFoundException('Không tìm thấy dossier của tranh chấp', ErrorCode.ITEM_NOT_FOUND)
    }

    const pdfContent = buildDossierPdfContent(dossierRecord)
    const buffer = createDossierPdf(pdfContent)

    const sanitizedDisputeId = dossierRecord.disputeId.replace(/[^A-Za-z0-9_-]/g, '')
    const sanitizedBase = sanitizedDisputeId.length > 0 ? sanitizedDisputeId : 'dispute'
    const versionLabel = String(dossierRecord.version).padStart(2, '0')
    const timestampLabel = formatDateToken(dossierRecord.generatedAt)
    const filename = `dossier-${sanitizedBase}-v${versionLabel}-${timestampLabel}.pdf`

    return { buffer, filename }
}

const assignArbitrator = async (adminId: string, disputeId: string, payload: AdminAssignArbitratorInput) => {
    void adminId

    const { arbitratorId } = payload

    const [disputeRecord, arbitrator] = await Promise.all([
        prismaClient.dispute.findUnique({
            where: { id: disputeId },
            include: adminDisputeDetailInclude
        }),
        prismaClient.user.findFirst({
            where: {
                id: arbitratorId,
                role: Role.ARBITRATOR,
                isActive: true
            }
        })
    ])

    if (!disputeRecord) {
        throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
    }

    if (!arbitrator) {
        throw new BadRequestException('Không tìm thấy trọng tài hợp lệ', ErrorCode.ITEM_NOT_FOUND)
    }

    if (!disputeRecord.lockedAt) {
        throw new BadRequestException(
            'Cần khóa hồ sơ tranh chấp trước khi phân công trọng tài',
            ErrorCode.PARAM_QUERY_ERROR
        )
    }

    if (disputeRecord.arbitratorId === arbitratorId) {
        return buildAdminDisputeDetailResponse(disputeRecord)
    }

    const updated = await prismaClient.dispute.update({
        where: { id: disputeId },
        data: {
            arbitratorId,
            arbitratorAssignedAt: new Date()
        },
        include: adminDisputeDetailInclude
    })

    return buildAdminDisputeDetailResponse(updated)
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

const buildArbitrationTimelineEntries = (
    disputeRecord: AdminDisputeDetailRecord,
    evidenceSubmissions: AdminEvidenceSubmission[]
): ArbitrationTimelineEntry[] => {
    const timelineEntries: ArbitrationTimelineEntry[] = []
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

    timelineEntries.sort((a, b) => a.at.getTime() - b.at.getTime())

    return timelineEntries
}

const composeMilestoneSubmissionPayload = (
    submissions: AdminMilestoneSubmission[],
    assetMap: Map<string, AdminEvidenceAsset>
) => {
    return submissions.map(submission => {
        const attachments = submission.attachments.map(attachment => {
            const asset = attachment.asset ?? (attachment.assetId ? assetMap.get(attachment.assetId) ?? null : null)

            return {
                id: attachment.id,
                assetId: attachment.assetId ?? asset?.id ?? null,
                name: attachment.name ?? null,
                url: attachment.url ?? asset?.url ?? null,
                mimeType: attachment.mimeType ?? asset?.mimeType ?? null,
                size: attachment.size ?? asset?.bytes ?? null,
                createdAt: attachment.createdAt.toISOString()
            }
        })

        return {
            id: submission.id,
            milestoneId: submission.milestoneId,
            freelancerId: submission.freelancerId,
            freelancer: composeFullName(submission.freelancer?.profile) ?? null,
            status: submission.status,
            message: submission.message ?? null,
            reviewNote: submission.reviewNote ?? null,
            reviewRating: submission.reviewRating ?? null,
            reviewedAt: submission.reviewedAt ? submission.reviewedAt.toISOString() : null,
            reviewedById: submission.reviewedById ?? null,
            reviewedBy: composeFullName(submission.reviewer?.profile) ?? null,
            createdAt: submission.createdAt.toISOString(),
            updatedAt: submission.updatedAt.toISOString(),
            attachments
        }
    })
}

const composeEvidencePayload = (
    submissions: AdminEvidenceSubmission[],
    maps: {
        milestoneAttachmentMap: Map<string, AdminMilestoneEvidenceAttachment>
        chatAttachmentMap: Map<string, AdminChatEvidenceAttachment>
        assetMap: Map<string, AdminEvidenceAsset>
    }
) => {
    return submissions.map(submission => {
        const evidenceItems = submission.items.map(item => {
            const baseAsset = item.asset ?? (item.assetId ? maps.assetMap.get(item.assetId) ?? null : null)
            const assetSummary = composeAssetSummary(baseAsset ?? null)

            let reference: Record<string, unknown> | null = null

            if (item.sourceType === ArbitrationEvidenceSourceType.MILESTONE_ATTACHMENT && item.sourceId) {
                const attachment = maps.milestoneAttachmentMap.get(item.sourceId)
                if (attachment) {
                    const attachmentAsset = attachment.asset ?? (attachment.assetId ? maps.assetMap.get(attachment.assetId) ?? null : null)
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
                const attachment = maps.chatAttachmentMap.get(item.sourceId)
                if (attachment) {
                    const attachmentAsset = attachment.asset ?? (attachment.assetId ? maps.assetMap.get(attachment.assetId) ?? null : null)
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
                const asset = maps.assetMap.get(item.assetId)
                if (asset) {
                    reference = {
                        type: 'ASSET',
                        asset: composeAssetSummary(asset)
                    }
                }
            } else if (item.sourceType === ArbitrationEvidenceSourceType.EXTERNAL_URL) {
                reference = {
                    type: 'EXTERNAL_URL',
                    url: item.url ?? null
                }
            }

            return {
                id: item.id,
                submissionId: item.submissionId,
                label: item.label ?? null,
                description: item.description ?? null,
                sourceType: item.sourceType,
                sourceId: item.sourceId ?? null,
                url: item.url ?? null,
                assetId: item.assetId ?? null,
                createdAt: item.createdAt.toISOString(),
                asset: assetSummary,
                reference
            }
        })

        return {
            id: submission.id,
            disputeId: submission.disputeId,
            submittedById: submission.submittedById,
            statement: submission.statement ?? null,
            noAdditionalEvidence: submission.noAdditionalEvidence,
            submittedAt: submission.submittedAt.toISOString(),
            updatedAt: submission.updatedAt.toISOString(),
            submittedBy: composeUserSummary(submission.submittedBy),
            items: evidenceItems
        }
    })
}

const buildArbitrationCaseData = async (
    disputeRecord: AdminDisputeDetailRecord,
    officerUserId: string
): Promise<PreparedArbitrationCase> => {
    if (!disputeRecord.escrow || !disputeRecord.escrow.milestone || !disputeRecord.escrow.milestone.contract) {
        throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
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

    const milestoneSubmissions: AdminMilestoneSubmission[] = await prismaClient.milestoneSubmission.findMany({
        where: { milestoneId: milestone.id },
        include: adminMilestoneSubmissionInclude,
        orderBy: { createdAt: 'asc' }
    })

    const timelineEntries = buildArbitrationTimelineEntries(disputeRecord, evidenceSubmissions)
    const milestoneSubmissionPayload = composeMilestoneSubmissionPayload(milestoneSubmissions, assetMap)
    const evidencePayload = composeEvidencePayload(evidenceSubmissions, {
        milestoneAttachmentMap,
        chatAttachmentMap,
        assetMap
    })

    const milestonePayload = {
        id: milestone.id,
        title: milestone.title,
        status: milestone.status,
        amount: Number(milestone.amount),
        currency: milestone.currency,
        startAt: milestone.startAt ? milestone.startAt.toISOString() : null,
        endAt: milestone.endAt ? milestone.endAt.toISOString() : null,
        contractId: milestone.contractId,
        contractTitle: milestone.contract?.title ?? null
    }

    const funded = Number(escrow.amountFunded)
    const released = Number(escrow.amountReleased)
    const refunded = Number(escrow.amountRefunded)

    const payload = {
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
                userId: officerUserId,
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
        milestone: milestonePayload,
        milestoneSubmissions: milestoneSubmissionPayload,
        evidence: evidencePayload
    }

    return { payload, timelineEntries }
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

    const officerUserId = disputeRecord.arbitratorId ?? adminId
    const preparedCase = await buildArbitrationCaseData(disputeRecord, officerUserId)

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

        const timelineEntries: ArbitrationTimelineEntry[] = [...preparedCase.timelineEntries]
        timelineEntries.push({
            at: created.generatedAt,
            actor: adminId,
            action: 'DOSSIER_GENERATED',
            details: `Version ${nextVersion}`
        })

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
            ...preparedCase.payload,
            timeline: timelineEntries.map(entry => ({
                at: entry.at.toISOString(),
                actor: entry.actor,
                action: entry.action,
                details: entry.details ?? null
            }))
        }

        const hash = createHash('sha256').update(JSON.stringify(payloadData)).digest('hex')
        ;(payloadData.meta as Record<string, unknown>).hash = hash

        await tx.arbitrationDossier.update({
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

const getArbitrationContext = async (
    viewer: ArbitrationContextViewer,
    disputeId: string
) => {
    const disputeRecord = await prismaClient.dispute.findUnique({
        where: { id: disputeId },
        include: adminDisputeDetailInclude
    })

    if (!disputeRecord) {
        throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
    }

    if (viewer.role === Role.ARBITRATOR) {
        if (disputeRecord.arbitratorId !== viewer.userId) {
            throw new ForbiddenException(
                'Tranh chấp không được phân công cho trọng tài này',
                ErrorCode.FORBIDDEN
            )
        }
    }

    if (!disputeRecord.lockedAt) {
        throw new BadRequestException('Tranh chấp chưa được khóa hồ sơ trọng tài', ErrorCode.PARAM_QUERY_ERROR)
    }

    if (
        disputeRecord.status !== DisputeStatus.ARBITRATION &&
        disputeRecord.status !== DisputeStatus.ARBITRATION_READY
    ) {
        throw new BadRequestException('Tranh chấp chưa ở giai đoạn xem xét trọng tài', ErrorCode.PARAM_QUERY_ERROR)
    }

    const officerUserId = disputeRecord.arbitratorId ?? viewer.userId
    const preparedCase = await buildArbitrationCaseData(disputeRecord, officerUserId)
    const timeline = preparedCase.timelineEntries.map(entry => ({
        at: entry.at.toISOString(),
        actor: entry.actor,
        action: entry.action,
        details: entry.details ?? null
    }))

    const arbitrationContext = {
        meta: {
            disputeId,
            status: disputeRecord.status,
            lockedAt: disputeRecord.lockedAt.toISOString(),
            arbitrationDeadline: disputeRecord.arbitrationDeadline
                ? disputeRecord.arbitrationDeadline.toISOString()
                : null,
            currentDossierVersion: disputeRecord.currentDossierVersion ?? null
        },
        ...preparedCase.payload,
        timeline
    }

    return {
        dispute: buildAdminDisputeDetailResponse(disputeRecord),
        arbitrationContext
    }
}

const recordArbitrationDecision = async (
    adminId: string,
    disputeId: string,
    payload: AdminRecordArbitrationDecisionInput
) => {
    const disputeRecord = await prismaClient.dispute.findUnique({
        where: { id: disputeId },
        include: adminDisputeDetailInclude
    })

    if (!disputeRecord || !disputeRecord.escrow || !disputeRecord.escrow.milestone) {
        throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
    }

    if (!disputeRecord.lockedAt) {
        throw new BadRequestException('Cần khóa hồ sơ trước khi ra phán quyết', ErrorCode.PARAM_QUERY_ERROR)
    }

    if (disputeRecord.status !== DisputeStatus.ARBITRATION) {
        throw new BadRequestException('Tranh chấp chưa ở giai đoạn trọng tài', ErrorCode.PARAM_QUERY_ERROR)
    }

    const escrow = disputeRecord.escrow as AdminDisputeEscrow

    const availableCents = Math.max(
        0,
        decimalToCents(escrow.amountFunded) -
            decimalToCents(escrow.amountReleased) -
            decimalToCents(escrow.amountRefunded)
    )

    if (availableCents <= 0) {
        throw new BadRequestException('Không còn giá trị đang tranh chấp để phân bổ', ErrorCode.PARAM_QUERY_ERROR)
    }

    const releaseCents = Math.round(payload.releaseAmount * 100)
    const refundCents = Math.round(payload.refundAmount * 100)

    if (releaseCents > availableCents || refundCents > availableCents) {
        throw new BadRequestException('Số tiền phán quyết vượt quá giá trị đang tranh chấp', ErrorCode.PARAM_QUERY_ERROR)
    }

    if (payload.awardType === 'RELEASE_ALL') {
        if (releaseCents !== availableCents || refundCents !== 0) {
            throw new BadRequestException(
                'Phán quyết trả hết cho freelancer phải phân bổ toàn bộ số tiền tranh chấp cho freelancer',
                ErrorCode.PARAM_QUERY_ERROR
            )
        }
    } else if (payload.awardType === 'REFUND_ALL') {
        if (refundCents !== availableCents || releaseCents !== 0) {
            throw new BadRequestException(
                'Phán quyết hoàn hết cho client phải phân bổ toàn bộ số tiền tranh chấp cho client',
                ErrorCode.PARAM_QUERY_ERROR
            )
        }
    } else if (releaseCents + refundCents !== availableCents) {
        throw new BadRequestException(
            'Tổng tiền phân bổ phải đúng bằng giá trị đang tranh chấp',
            ErrorCode.PARAM_QUERY_ERROR
        )
    }

    const summary = payload.summary.trim()
    const reasoning = payload.reasoning?.trim() ?? null
    const decidedAt = new Date()

    const resolvedStatus =
        releaseCents === availableCents
            ? DisputeStatus.RESOLVED_RELEASE_ALL
            : refundCents === availableCents
            ? DisputeStatus.RESOLVED_REFUND_ALL
            : DisputeStatus.RESOLVED_SPLIT

    const attachments = (payload.attachments ?? []).map(item => ({
        assetId: item.assetId,
        label: item.label?.trim() && item.label.trim().length > 0 ? item.label.trim() : null
    }))

    const uniqueAssetIds = Array.from(new Set(attachments.map(item => item.assetId)))
    if (uniqueAssetIds.length > 0) {
        const assetCount = await prismaClient.asset.count({ where: { id: { in: uniqueAssetIds } } })
        if (assetCount !== uniqueAssetIds.length) {
            throw new BadRequestException('Một số tài liệu đính kèm không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }
    }

    await prismaClient.$transaction(async tx => {
        await tx.dispute.update({
            where: { id: disputeId },
            data: {
                status: resolvedStatus,
                decidedRelease: centsToDecimal(releaseCents),
                decidedRefund: centsToDecimal(refundCents),
                decidedById: adminId,
                decidedAt,
                decisionSummary: summary,
                decisionReasoning: reasoning,
                responseDeadline: null
            }
        })

        await tx.arbitrationDecisionAttachment.deleteMany({ where: { disputeId } })

        if (attachments.length > 0) {
            await tx.arbitrationDecisionAttachment.createMany({
                data: attachments.map(item => ({
                    disputeId,
                    assetId: item.assetId,
                    label: item.label
                }))
            })
        }
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

const listArbitratorAssignedDisputes = async (arbitratorId: string) => {
    const disputeRecords = await prismaClient.dispute.findMany({
        where: {
            arbitratorId,
            escrow: {
                milestone: {
                    isDeleted: false
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        include: adminDisputeInclude
    })

    return {
        total: disputeRecords.length,
        data: disputeRecords.map(buildAdminDisputeResponse)
    }
}

const getArbitratorAssignedDispute = async (arbitratorId: string, disputeId: string) => {
    const disputeRecord = await prismaClient.dispute.findFirst({
        where: {
            id: disputeId,
            arbitratorId,
            escrow: {
                milestone: {
                    isDeleted: false
                }
            }
        },
        include: adminDisputeDetailInclude
    })

    if (!disputeRecord) {
        throw new NotFoundException(
            'Không tìm thấy tranh chấp được phân công cho trọng tài',
            ErrorCode.ITEM_NOT_FOUND
        )
    }

    return buildAdminDisputeDetailResponse(disputeRecord)
}


const adminDisputeService = {
    listArbitrators,
    listDisputes,
    getDispute,
    listDisputeDossiers,
    getDisputeDossierPdf,
    assignArbitrator,
    joinDispute,
    requestArbitrationFees,
    lockDispute,
    generateArbitrationDossier,
    getArbitrationContext,
    recordArbitrationDecision,
    listArbitratorAssignedDisputes,
    getArbitratorAssignedDispute
}

export default adminDisputeService
