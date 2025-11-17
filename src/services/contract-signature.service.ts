import { Prisma } from '~/generated/prisma'
import {
        ContractAcceptanceAction,
        ContractSignatureProvider,
        ContractSignatureStatus,
        ContractStatus,
        Role
} from '~/generated/prisma'

import { DOCUSIGN } from '~/config/environment'
import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import docusignService, {
        DocuSignEnvelopeDefinition,
        DocuSignSignerDefinition
} from './docusign.service'
import { TriggerDocuSignEnvelopeInput } from '~/schema/contract.schema'

const composeDisplayName = (profile?: { firstName: string | null; lastName: string | null } | null) => {
        const firstName = profile?.firstName?.trim() ?? ''
        const lastName = profile?.lastName?.trim() ?? ''
        const full = `${firstName} ${lastName}`.trim()
        return full.length > 0 ? full : null
}

const escapeHtml = (value: string) =>
        value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')

const formatJsonSnapshot = (value: Prisma.JsonValue | null | undefined) => {
        if (value === null || value === undefined) {
                return '<em>Không có snapshot điều khoản</em>'
        }

        if (typeof value === 'string') {
                return `<pre>${escapeHtml(value)}</pre>`
        }

        return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`
}

const renderContractHtmlDocument = (contract: {
        id: string
        title: string
        currency: string
        createdAt: Date
        platformTermsVersion: string | null
        platformTermsSnapshot: Prisma.JsonValue | null
        clientName: string
        clientEmail: string
        freelancerName: string
        freelancerEmail: string
        jobTitle: string | null
        platformSignerName?: string | null
        platformSignerEmail?: string | null
}) => {
        const title = escapeHtml(contract.title)
        const jobTitle = contract.jobTitle ? escapeHtml(contract.jobTitle) : 'Không xác định'
        const termsVersion = escapeHtml(contract.platformTermsVersion ?? 'Chưa xác định')
        const createdAt = contract.createdAt.toISOString()

        return `<!DOCTYPE html>
<html lang="vi">
        <head>
                <meta charset="utf-8" />
                <title>Contract ${escapeHtml(contract.id)}</title>
        </head>
        <body>
                <h1>Hợp đồng #${escapeHtml(contract.id)}</h1>
                <p><strong>Tiêu đề:</strong> ${title}</p>
                <p><strong>Công việc:</strong> ${jobTitle}</p>
                <p><strong>Ngày tạo:</strong> ${createdAt}</p>
                <p><strong>Client:</strong> ${escapeHtml(contract.clientName)} (${escapeHtml(contract.clientEmail)})</p>
                <p><strong>Freelancer:</strong> ${escapeHtml(contract.freelancerName)} (${escapeHtml(contract.freelancerEmail)})</p>
                <h2>Điều khoản nền tảng (Phiên bản ${termsVersion})</h2>
                ${formatJsonSnapshot(contract.platformTermsSnapshot)}
                <h3>Freelancer xác nhận</h3>
                <p>Checkbox xác nhận: /freelancer_terms_checkbox/</p>
                <p>Ký tại: /freelancer_sign_here/</p>
                <h3>Client xác nhận</h3>
                <p>Checkbox xác nhận: /client_terms_checkbox/</p>
                <p>Ký tại: /client_sign_here/</p>
                ${
                        contract.platformSignerEmail
                                ? `<h3>Đại diện nền tảng</h3>
                <p>Email: ${escapeHtml(contract.platformSignerEmail)}</p>
                <p>Ký tại: /platform_sign_here/</p>`
                                : ''
                }
        </body>
</html>`
}

type ContractActor = { id: string; role: Role | null } | null | undefined

type StoredRecipientRole = 'freelancer' | 'client' | 'platform'

type StoredRecipient = {
        role: StoredRecipientRole
        userId: string | null
        email: string
        name: string
        recipientId: string
        routingOrder: number
}

const normaliseEmail = (email: string | null | undefined) => email?.trim().toLowerCase() ?? null

const toStoredRecipientJson = (recipients: StoredRecipient[]): Prisma.InputJsonValue =>
        recipients.length > 0
                ? (recipients as unknown as Prisma.InputJsonValue)
                : (Prisma.JsonNull as unknown as Prisma.InputJsonValue)

const parseStoredRecipients = (value: Prisma.JsonValue | null | undefined): StoredRecipient[] => {
        if (!value || !Array.isArray(value)) {
                return []
        }

        return value
                .map(item => {
                        if (!item || typeof item !== 'object') {
                                return null
                        }
                        const record = item as Record<string, unknown>
                        const role = record.role
                        const email = typeof record.email === 'string' ? record.email : null
                        const recipientId = typeof record.recipientId === 'string' ? record.recipientId : null

                        if (!email || !recipientId || role !== 'freelancer' && role !== 'client' && role !== 'platform') {
                                return null
                        }

                        return {
                                role,
                                email,
                                recipientId,
                                routingOrder: typeof record.routingOrder === 'number' ? record.routingOrder : 1,
                                name:
                                        typeof record.name === 'string' && record.name.trim().length > 0
                                                ? record.name
                                                : 'Signer',
                                userId: typeof record.userId === 'string' ? record.userId : null
                        }
                })
                .filter((item): item is StoredRecipient => Boolean(item))
}

const ensureDocuSignEnabled = () => {
        if (!DOCUSIGN.ENABLED) {
                throw new BadRequestException('DocuSign chưa được cấu hình', ErrorCode.PARAM_QUERY_ERROR)
        }
}

const ensureContractAccess = (contract: { clientId: string; freelancerId: string }, actor: ContractActor, options?: {
        skipAuthorization?: boolean
}) => {
        if (options?.skipAuthorization || !actor) {
                return
        }

        if (actor.role === Role.ADMIN) {
                return
        }

        if (actor.id === contract.clientId || actor.id === contract.freelancerId) {
                return
        }

        throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
}

const buildSignerDefinition = (input: {
        role: StoredRecipientRole
        name: string
        email: string
        recipientId: string
        routingOrder: number
}) => {
        const tabs: Record<string, unknown> = {}

        if (input.role === 'freelancer') {
                tabs.signHereTabs = [
                        {
                                anchorString: '/freelancer_sign_here/',
                                anchorUnits: 'pixels',
                                anchorYOffset: '0',
                                anchorXOffset: '0'
                        }
                ]
                tabs.checkboxTabs = [
                        {
                                anchorString: '/freelancer_terms_checkbox/',
                                tabLabel: 'FreelancerAck',
                                selected: 'false'
                        }
                ]
        } else if (input.role === 'client') {
                tabs.signHereTabs = [
                        {
                                anchorString: '/client_sign_here/',
                                anchorUnits: 'pixels',
                                anchorYOffset: '0',
                                anchorXOffset: '0'
                        }
                ]
                tabs.checkboxTabs = [
                        {
                                anchorString: '/client_terms_checkbox/',
                                tabLabel: 'ClientAck',
                                selected: 'false'
                        }
                ]
        } else {
                tabs.signHereTabs = [
                        {
                                anchorString: '/platform_sign_here/',
                                anchorUnits: 'pixels',
                                anchorYOffset: '0',
                                anchorXOffset: '0'
                        }
                ]
        }

        return {
                name: input.name,
                email: input.email,
                recipientId: input.recipientId,
                routingOrder: String(input.routingOrder),
                roleName:
                        input.role === 'freelancer'
                                ? 'FreelancerSigner'
                                : input.role === 'client'
                                  ? 'ClientSigner'
                                  : 'PlatformCounterSigner',
                tabs
        } satisfies DocuSignSignerDefinition
}

const buildEnvelopeDefinition = (contract: {
        id: string
        title: string
        currency: string
        createdAt: Date
        platformTermsVersion: string | null
        platformTermsSnapshot: Prisma.JsonValue | null
        jobPostTitle: string | null
        client: { name: string; email: string }
        freelancer: { name: string; email: string }
        platformSigner?: { name: string; email: string } | null
}, storedRecipients: StoredRecipient[]): DocuSignEnvelopeDefinition => {
        const html = renderContractHtmlDocument({
                id: contract.id,
                title: contract.title,
                currency: contract.currency,
                createdAt: contract.createdAt,
                platformTermsVersion: contract.platformTermsVersion,
                platformTermsSnapshot: contract.platformTermsSnapshot,
                jobTitle: contract.jobPostTitle,
                clientName: contract.client.name,
                clientEmail: contract.client.email,
                freelancerName: contract.freelancer.name,
                freelancerEmail: contract.freelancer.email,
                platformSignerName: contract.platformSigner?.name ?? null,
                platformSignerEmail: contract.platformSigner?.email ?? null
        })

        const documentBase64 = Buffer.from(html, 'utf8').toString('base64')
        const signers = storedRecipients.map(recipient => buildSignerDefinition(recipient))

        return {
                emailSubject: DOCUSIGN.EMAIL_SUBJECT,
                emailBlurb: DOCUSIGN.EMAIL_BODY,
                documents: [
                        {
                                documentBase64,
                                name: `contract-${contract.id}.html`,
                                documentId: '1',
                                fileExtension: 'html'
                        }
                ],
                recipients: {
                        signers
                },
                customFields: {
                        textCustomFields: [
                                { name: 'contractId', value: contract.id, show: 'false' },
                                {
                                        name: 'termsVersion',
                                        value: contract.platformTermsVersion ?? 'unknown',
                                        show: 'false'
                                }
                        ]
                },
                status: 'sent'
        }
}

const triggerDocuSignEnvelope = async (
        contractId: string,
        actor: ContractActor,
        payload?: TriggerDocuSignEnvelopeInput,
        options?: { skipAuthorization?: boolean }
) => {
        ensureDocuSignEnabled()
        const resolvedPayload = payload ?? {}

        const contractRecord = await prismaClient.contract.findUnique({
                where: { id: contractId },
                select: {
                        id: true,
                        title: true,
                        currency: true,
                        status: true,
                        clientId: true,
                        freelancerId: true,
                        createdAt: true,
                        jobPost: { select: { title: true } },
                        platformTermsVersion: true,
                        platformTermsSnapshot: true,
                        signatureEnvelopeId: true,
                        signatureStatus: true,
                        signatureProvider: true
                }
        })

        if (!contractRecord) {
                throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
        }

        ensureContractAccess(contractRecord, actor, options)

        if (!contractRecord.platformTermsSnapshot) {
                throw new BadRequestException('Hợp đồng chưa có snapshot điều khoản', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (contractRecord.signatureEnvelopeId && !resolvedPayload.forceResend) {
                throw new BadRequestException('Đã gửi yêu cầu ký DocuSign trước đó', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (contractRecord.signatureEnvelopeId && resolvedPayload.forceResend) {
                try {
                        await docusignService.voidEnvelope(
                                contractRecord.signatureEnvelopeId,
                                resolvedPayload.resendReason ?? 'Resend contract'
                        )
                } catch (error) {
                        console.error('Không thể void envelope DocuSign cũ', error)
                }
        }

        const participantUsers = await prismaClient.user.findMany({
                        where: { id: { in: [contractRecord.clientId, contractRecord.freelancerId] } },
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
                })

        const clientUser = participantUsers.find(user => user.id === contractRecord.clientId)
        const freelancerUser = participantUsers.find(user => user.id === contractRecord.freelancerId)

        if (!clientUser || !freelancerUser) {
                throw new BadRequestException('Thiếu thông tin user để gửi DocuSign', ErrorCode.PARAM_QUERY_ERROR)
        }

        const storedRecipients: StoredRecipient[] = [
                {
                        role: 'freelancer',
                        userId: freelancerUser.id,
                        email: freelancerUser.email,
                        name: composeDisplayName(freelancerUser.profile) ?? 'Freelancer',
                        recipientId: '1',
                        routingOrder: 1
                },
                {
                        role: 'client',
                        userId: clientUser.id,
                        email: clientUser.email,
                        name: composeDisplayName(clientUser.profile) ?? 'Client',
                        recipientId: '2',
                        routingOrder: 2
                }
        ]

        if (DOCUSIGN.PLATFORM_SIGNER) {
                storedRecipients.push({
                        role: 'platform',
                        userId: null,
                        email: DOCUSIGN.PLATFORM_SIGNER.email,
                        name: DOCUSIGN.PLATFORM_SIGNER.name,
                        recipientId: '3',
                        routingOrder: 3
                })
        }

        const freelancerRecipient = storedRecipients.find(recipient => recipient.role === 'freelancer')!
        const clientRecipient = storedRecipients.find(recipient => recipient.role === 'client')!

        const envelopeDefinition = buildEnvelopeDefinition(
                {
                        id: contractRecord.id,
                        title: contractRecord.title,
                        currency: contractRecord.currency,
                        createdAt: contractRecord.createdAt,
                        platformTermsVersion: contractRecord.platformTermsVersion,
                        platformTermsSnapshot: contractRecord.platformTermsSnapshot,
                        jobPostTitle: contractRecord.jobPost?.title ?? null,
                        client: {
                                name: clientRecipient.name ?? 'Client',
                                email: clientRecipient.email
                        },
                        freelancer: {
                                name: freelancerRecipient.name ?? 'Freelancer',
                                email: freelancerRecipient.email
                        },
                        platformSigner: DOCUSIGN.PLATFORM_SIGNER
                },
                storedRecipients
        )

        const summary = await docusignService.sendEnvelope(envelopeDefinition)

        await prismaClient.contract.update({
                where: { id: contractRecord.id },
                data: {
                        signatureProvider: ContractSignatureProvider.DOCUSIGN,
                        signatureEnvelopeId: summary.envelopeId,
                        signatureStatus: ContractSignatureStatus.SENT,
                        signatureSentAt: new Date(),
                        signatureDocumentsUri: summary.documentsUri ?? null,
                        signatureCertificateUri: summary.certificateUri ?? null,
                        signatureEnvelopeSummary: summary as unknown as Prisma.InputJsonValue,
                        signatureRecipients: toStoredRecipientJson(storedRecipients),
                        signatureLastError: null
                }
        })
}

const mapDocuSignStatus = (status: string | null | undefined): ContractSignatureStatus | null => {
        const normalized = status?.toLowerCase()
        switch (normalized) {
                case 'sent':
                case 'delivered':
                        return ContractSignatureStatus.SENT
                case 'completed':
                        return ContractSignatureStatus.COMPLETED
                case 'declined':
                        return ContractSignatureStatus.DECLINED
                case 'voided':
                        return ContractSignatureStatus.VOIDED
                default:
                        return null
        }
}

const parseDocuSignDate = (value: string | null | undefined) => {
        if (!value) {
                return null
        }
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? null : parsed
}

type DocuSignConnectRecipient = {
        recipientId?: string
        email?: string
        name?: string
        roleName?: string
        status?: string
        signedDateTime?: string
}

type DocuSignConnectEnvelope = {
        envelopeId?: string
        status?: string
        statusDateTime?: string
        documentsUri?: string
        certificateUri?: string
        recipients?: {
                signers?: DocuSignConnectRecipient[]
        }
        customFields?: {
                textCustomFields?: Array<{ name?: string; value?: string }>
        }
}

const extractEnvelopePayload = (payload: unknown): DocuSignConnectEnvelope | null => {
        if (!payload || typeof payload !== 'object') {
                return null
        }
        const record = payload as Record<string, unknown>

        if (record.envelopeStatus && typeof record.envelopeStatus === 'object') {
                return record.envelopeStatus as DocuSignConnectEnvelope
        }

        if (record.data && typeof record.data === 'object') {
                const data = record.data as Record<string, unknown>
                if (typeof data.envelopeId === 'string') {
                        return data as DocuSignConnectEnvelope
                }
        }

        if (typeof record.envelopeId === 'string') {
                return record as DocuSignConnectEnvelope
        }

        return null
}

const findContractForEnvelope = async (
        envelopeId: string,
        customFields?: DocuSignConnectEnvelope['customFields']
) => {
        if (envelopeId) {
                const byEnvelope = await prismaClient.contract.findUnique({
                        where: { signatureEnvelopeId: envelopeId },
                        select: { id: true }
                })
                if (byEnvelope) {
                        return byEnvelope.id
                }
        }

        const contractIdField = customFields?.textCustomFields?.find(field =>
                field?.name?.toLowerCase() === 'contractid' && typeof field.value === 'string'
        )

        if (contractIdField?.value) {
                const byCustomField = await prismaClient.contract.findUnique({
                        where: { id: contractIdField.value },
                        select: { id: true }
                })
                return byCustomField?.id ?? null
        }

        return null
}

const handleDocuSignConnectEvent = async (payload: unknown) => {
        if (!DOCUSIGN.ENABLED) {
                return false
        }

        const envelope = extractEnvelopePayload(payload)
        if (!envelope?.envelopeId) {
                return false
        }

        const contractId = await findContractForEnvelope(envelope.envelopeId, envelope.customFields)
        if (!contractId) {
                        console.warn('DocuSign event không xác định được hợp đồng', envelope.envelopeId)
                return false
        }

        const contractRecord = await prismaClient.contract.findUnique({
                where: { id: contractId },
                select: {
                        id: true,
                        status: true,
                        clientId: true,
                        freelancerId: true,
                        platformTermsSnapshot: true,
                        platformTermsVersion: true,
                        signatureRecipients: true,
                        termsAcceptedAt: true,
                        clientAcceptedAt: true
                }
        })

        if (!contractRecord) {
                return false
        }

        const mappedStatus = mapDocuSignStatus(envelope.status ?? null)
        const storedRecipients = parseStoredRecipients(contractRecord.signatureRecipients)
        const signerStatuses = envelope.recipients?.signers ?? []
        const now = new Date()

        await prismaClient.$transaction(async tx => {
                const updateData: Prisma.ContractUpdateInput = {
                        signatureEnvelopeSummary: payload as Prisma.InputJsonValue,
                        signatureDocumentsUri: envelope.documentsUri ?? null,
                        signatureCertificateUri: envelope.certificateUri ?? null
                }

                if (mappedStatus) {
                        updateData.signatureStatus = mappedStatus
                        if (mappedStatus === ContractSignatureStatus.COMPLETED) {
                                updateData.signatureCompletedAt = parseDocuSignDate(envelope.statusDateTime) ?? now
                                updateData.signatureLastError = null
                        } else if (mappedStatus === ContractSignatureStatus.DECLINED) {
                                updateData.signatureDeclinedAt = parseDocuSignDate(envelope.statusDateTime) ?? now
                                updateData.signatureLastError = 'DocuSign envelope bị từ chối'
                        } else if (mappedStatus === ContractSignatureStatus.VOIDED) {
                                updateData.signatureVoidedAt = parseDocuSignDate(envelope.statusDateTime) ?? now
                                updateData.signatureLastError = 'DocuSign envelope bị void'
                        }
                }

                const acceptanceLogs: Prisma.ContractAcceptanceLogCreateManyInput[] = []

                signerStatuses.forEach(signer => {
                        const normalizedStatus = signer.status?.toLowerCase()
                        if (normalizedStatus !== 'completed') {
                                return
                        }

                        const matched = storedRecipients.find(rec => {
                                const matchesId = signer.recipientId && rec.recipientId === signer.recipientId
                                const matchesEmail =
                                        normaliseEmail(rec.email) === normaliseEmail(signer.email)
                                return matchesId || matchesEmail
                        })

                        if (!matched) {
                                return
                        }

                        const signedAt = parseDocuSignDate(signer.signedDateTime) ?? now

                        if (matched.role === 'freelancer' && !contractRecord.termsAcceptedAt) {
                                updateData.termsAcceptedAt = signedAt
                                updateData.termsAcceptedBy = { connect: { id: matched.userId ?? contractRecord.freelancerId } }
                                updateData.termsAcceptedIp = null
                                updateData.termsAcceptedUserAgent = 'docusign'
                                if (contractRecord.status === ContractStatus.DRAFT) {
                                        updateData.status = ContractStatus.ACTIVE
                                }
                                acceptanceLogs.push({
                                        contractId: contractRecord.id,
                                        actorId: matched.userId ?? contractRecord.freelancerId,
                                        action: ContractAcceptanceAction.ACCEPTED,
                                        termsVersion: contractRecord.platformTermsVersion ?? 'unknown',
                                        termsSnapshot: contractRecord.platformTermsSnapshot ?? Prisma.JsonNull,
                                        createdAt: signedAt,
                                        ipAddress: null,
                                        userAgent: 'docusign'
                                })
                        }

                        if (matched.role === 'client' && !contractRecord.clientAcceptedAt) {
                                updateData.clientAcceptedAt = signedAt
                                updateData.clientAcceptedBy = { connect: { id: matched.userId ?? contractRecord.clientId } }
                                updateData.clientAcceptedIp = null
                                updateData.clientAcceptedUserAgent = 'docusign'
                                acceptanceLogs.push({
                                        contractId: contractRecord.id,
                                        actorId: matched.userId ?? contractRecord.clientId,
                                        action: ContractAcceptanceAction.ACCEPTED,
                                        termsVersion: contractRecord.platformTermsVersion ?? 'unknown',
                                        termsSnapshot: contractRecord.platformTermsSnapshot ?? Prisma.JsonNull,
                                        createdAt: signedAt,
                                        ipAddress: null,
                                        userAgent: 'docusign'
                                })
                        }
                })

                await tx.contract.update({
                        where: { id: contractRecord.id },
                        data: updateData
                })

                if (acceptanceLogs.length > 0) {
                        await tx.contractAcceptanceLog.createMany({ data: acceptanceLogs })
                }
        })

        return true
}

const contractSignatureService = {
        isDocuSignEnabled: () => DOCUSIGN.ENABLED,
        triggerDocuSignEnvelope,
        handleDocuSignConnectEvent
}

export default contractSignatureService
