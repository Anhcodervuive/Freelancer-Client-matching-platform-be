import { randomUUID } from 'node:crypto'

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
        DocuSignEnvelopeDetails,
        DocuSignSignerDefinition
} from './docusign.service'
import { TriggerDocuSignEnvelopeInput } from '~/schema/contract.schema'
import { docusignEnvelopeQueue } from '~/queues/docusign.queue'
import type { DocuSignEnvelopeJobData } from '~/queues/docusign.queue'

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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null && !Array.isArray(value)

type TermsSectionSnapshot = {
        title: string | null
        body: string | null
        code: string | null
        version: string | null
        metadata: Record<string, unknown> | null
}

const describeMetadataValue = (raw: unknown): string => {
        if (raw === null || raw === undefined) {
                return '—'
        }

        if (typeof raw === 'string') {
                return raw
        }

        if (typeof raw === 'number' || typeof raw === 'boolean') {
                return String(raw)
        }

        if (Array.isArray(raw)) {
                const values = raw.map(item => describeMetadataValue(item)).filter(Boolean)
                return values.length > 0 ? values.join(', ') : '—'
        }

        if (isPlainObject(raw)) {
                try {
                        return JSON.stringify(raw)
                } catch {
                        return '[object]'
                }
        }

        return String(raw)
}

const renderBodyParagraphs = (body: string | null) => {
        if (!body) {
                return ''
        }

        const paragraphs = body
                .split(/\n{2,}/)
                .map(paragraph => paragraph.trim())
                .filter(paragraph => paragraph.length > 0)

        if (paragraphs.length === 0) {
                return ''
        }

        return `<div class="section-body">${paragraphs
                .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
                .join('')}</div>`
}

const renderSectionMetadata = (metadata: Record<string, unknown> | null) => {
        if (!metadata) {
                return ''
        }

        const entries = Object.entries(metadata).filter(([key]) => key.trim().length > 0)

        if (entries.length === 0) {
                return ''
        }

        return `<dl class="section-meta">${entries
                .map(([key, raw]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(describeMetadataValue(raw))}</dd>`)
                .join('')}</dl>`
}

const normaliseSection = (candidate: unknown): TermsSectionSnapshot | null => {
        if (!isPlainObject(candidate)) {
                return null
        }

        const metadataEntries: Record<string, unknown> = {}

        if (isPlainObject(candidate.metadata)) {
                Object.assign(metadataEntries, candidate.metadata)
        }

        Object.entries(candidate)
                .filter(([key]) => !['title', 'body', 'code', 'version', 'metadata'].includes(key))
                .forEach(([key, raw]) => {
                        metadataEntries[key] = raw
                })

        const metadata = Object.keys(metadataEntries).length > 0 ? metadataEntries : null

        const title = typeof candidate.title === 'string' ? candidate.title : null
        const body = typeof candidate.body === 'string' ? candidate.body : null
        const code = typeof candidate.code === 'string' ? candidate.code : null
        const version = typeof candidate.version === 'string' ? candidate.version : null

        if (!title && !body && !code && !version && !metadata) {
                return null
        }

        return { title, body, code, version, metadata }
}

const extractStructuredSections = (snapshot: Prisma.JsonValue | null | undefined): TermsSectionSnapshot[] | null => {
        if (!snapshot) {
                return null
        }

        if (isPlainObject(snapshot) && Array.isArray(snapshot.sections)) {
                const sections = snapshot.sections.map(normaliseSection).filter((section): section is TermsSectionSnapshot => Boolean(section))
                if (sections.length > 0) {
                        return sections
                }
        }

        if (Array.isArray(snapshot)) {
                const sections = snapshot.map(normaliseSection).filter((section): section is TermsSectionSnapshot => Boolean(section))
                if (sections.length > 0) {
                        return sections
                }
        }

        const singleSection = normaliseSection(snapshot)
        return singleSection ? [singleSection] : null
}

const renderStructuredSnapshot = (sections: TermsSectionSnapshot[]) =>
        `<div class="terms-sections">${sections
                .map((section, index) => {
                        const badges = [
                                section.code ? `<span class="section-badge">${escapeHtml(section.code)}</span>` : '',
                                section.version ? `<span class="section-badge">v${escapeHtml(section.version)}</span>` : ''
                        ]
                                .filter(Boolean)
                                .join('')

                        return `<div class="terms-section">
                                <div class="section-heading">
                                        <span>Điều ${index + 1}</span>
                                        ${badges}
                                </div>
                                ${section.title ? `<h3>${escapeHtml(section.title)}</h3>` : ''}
                                ${renderBodyParagraphs(section.body)}
                                ${renderSectionMetadata(section.metadata)}
                        </div>`
                })
                .join('')}</div>`

const formatJsonSnapshot = (value: Prisma.JsonValue | null | undefined) => {
        if (value === null || value === undefined) {
                return '<p class="empty">Không có snapshot điều khoản</p>'
        }

        const structuredSections = extractStructuredSections(value)
        if (structuredSections) {
                return renderStructuredSnapshot(structuredSections)
        }

        if (typeof value === 'string') {
                return `<div class="json-block"><pre>${escapeHtml(value)}</pre></div>`
        }

        return `<div class="json-block"><pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre></div>`
}

const formatDisplayDateTime = (value: Date) => {
        try {
                return new Intl.DateTimeFormat('vi-VN', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                        timeZone: 'Asia/Ho_Chi_Minh'
                }).format(value)
        } catch {
                return value.toISOString()
        }
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
        const createdAt = formatDisplayDateTime(contract.createdAt)

        return `<!DOCTYPE html>
<html lang="vi">
        <head>
                <meta charset="utf-8" />
                <title>Hợp đồng ${escapeHtml(contract.id)}</title>
                <style>
                        :root {
                                color-scheme: light dark;
                        }
                        body {
                                font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                                margin: 0;
                                padding: 32px;
                                background: #f5f5f7;
                                color: #1f1f1f;
                        }
                        .doc {
                                max-width: 900px;
                                margin: 0 auto;
                                background: #fff;
                                border-radius: 16px;
                                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
                                overflow: hidden;
                        }
                        header {
                                background: linear-gradient(135deg, #4c6ef5, #7950f2);
                                color: #fff;
                                padding: 32px;
                        }
                        header h1 {
                                margin: 0 0 8px 0;
                                font-size: 28px;
                        }
                        header p {
                                margin: 0;
                                font-size: 16px;
                        }
                        section {
                                padding: 32px;
                                border-bottom: 1px solid #f0f0f0;
                        }
                        section:last-of-type {
                                border-bottom: none;
                        }
                        h2 {
                                margin-top: 0;
                                font-size: 20px;
                                color: #343a40;
                        }
                        dl {
                                display: grid;
                                grid-template-columns: 200px 1fr;
                                row-gap: 12px;
                                column-gap: 16px;
                                margin: 0;
                        }
                        dt {
                                font-weight: 600;
                                color: #495057;
                        }
                        dd {
                                margin: 0;
                        }
                        .json-block {
                                background: #0f172a;
                                color: #e1e8ff;
                                border-radius: 12px;
                                padding: 16px;
                                margin-top: 16px;
                                font-family: 'Fira Code', 'SFMono-Regular', Consolas, monospace;
                                overflow-x: auto;
                                font-size: 13px;
                        }
                        .json-block pre {
                                margin: 0;
                                white-space: pre-wrap;
                        }
                        .empty {
                                color: #868e96;
                                font-style: italic;
                        }
                        .signer-grid {
                                display: grid;
                                gap: 16px;
                                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                        }
                        .signer-card {
                                border: 1px solid #e9ecef;
                                border-radius: 12px;
                                padding: 16px;
                                background: #fdfdff;
                        }
                        .signer-card h3 {
                                margin-top: 0;
                        }
                        .tab-placeholder {
                                display: inline-flex;
                                align-items: center;
                                padding: 4px 10px;
                                border-radius: 999px;
                                background: #edf2ff;
                                color: #364fc7;
                                font-weight: 600;
                                font-size: 13px;
                                margin: 4px 0;
                        }
                        .terms-sections {
                                display: flex;
                                flex-direction: column;
                                gap: 24px;
                                margin-top: 16px;
                        }
                        .terms-section {
                                background: #f8f9ff;
                                border: 1px solid #dee2ff;
                                border-radius: 12px;
                                padding: 20px;
                                box-shadow: 0 10px 30px rgba(76, 110, 245, 0.08);
                        }
                        .section-heading {
                                display: flex;
                                flex-wrap: wrap;
                                gap: 8px;
                                align-items: center;
                                font-size: 13px;
                                text-transform: uppercase;
                                letter-spacing: 0.08em;
                                color: #5c7cfa;
                                font-weight: 600;
                                margin-bottom: 8px;
                        }
                        .section-badge {
                                background: #edf2ff;
                                color: #364fc7;
                                border-radius: 999px;
                                padding: 2px 10px;
                        }
                        .terms-section h3 {
                                margin: 0 0 12px 0;
                                font-size: 18px;
                                color: #212529;
                        }
                        .section-body p {
                                margin: 0 0 12px 0;
                                line-height: 1.6;
                                color: #343a40;
                        }
                        .section-body p:last-child {
                                margin-bottom: 0;
                        }
                        .section-meta {
                                margin: 16px 0 0 0;
                                display: grid;
                                grid-template-columns: 160px 1fr;
                                row-gap: 8px;
                                column-gap: 12px;
                                font-size: 14px;
                        }
                        .section-meta dt {
                                font-weight: 600;
                                color: #495057;
                        }
                        .section-meta dd {
                                margin: 0;
                                color: #212529;
                        }
                </style>
        </head>
        <body>
                <article class="doc">
                        <header>
                                <h1>Hợp đồng #${escapeHtml(contract.id)}</h1>
                                <p>Được tạo ngày ${createdAt}</p>
                        </header>

                        <section>
                                <h2>Thông tin tổng quan</h2>
                                <dl>
                                        <dt>Tiêu đề</dt>
                                        <dd>${title}</dd>
                                        <dt>Công việc</dt>
                                        <dd>${jobTitle}</dd>
                                        <dt>Client</dt>
                                        <dd>${escapeHtml(contract.clientName)} (${escapeHtml(contract.clientEmail)})</dd>
                                        <dt>Freelancer</dt>
                                        <dd>${escapeHtml(contract.freelancerName)} (${escapeHtml(contract.freelancerEmail)})</dd>
                                        <dt>Phiên bản điều khoản</dt>
                                        <dd>${termsVersion}</dd>
                                </dl>
                        </section>

                        <section>
                                <h2>Điều khoản nền tảng</h2>
                                <p>Snapshot được lưu tại thời điểm ký kết:</p>
                                ${formatJsonSnapshot(contract.platformTermsSnapshot)}
                        </section>

                        <section>
                                <h2>Thông tin ký</h2>
                                <div class="signer-grid">
                                        <div class="signer-card">
                                                <h3>Freelancer</h3>
                                                <p><span class="tab-placeholder">/freelancer_terms_checkbox/</span> Checkbox xác nhận</p>
                                                <p><span class="tab-placeholder">/freelancer_sign_here/</span> Ký tại đây</p>
                                        </div>
                                        <div class="signer-card">
                                                <h3>Client</h3>
                                                <p><span class="tab-placeholder">/client_terms_checkbox/</span> Checkbox xác nhận</p>
                                                <p><span class="tab-placeholder">/client_sign_here/</span> Ký tại đây</p>
                                        </div>
                                        ${
                                                contract.platformSignerEmail
                                                        ? `<div class="signer-card">
                                                <h3>Đại diện nền tảng</h3>
                                                <p>Email: ${escapeHtml(contract.platformSignerEmail)}</p>
                                                <p><span class="tab-placeholder">/platform_sign_here/</span> Ký tại đây</p>
                                        </div>`
                                                        : ''
                                        }
                                </div>
                        </section>
                </article>
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

const resolveDocuSignUri = (uri?: string | null) => {
        if (!uri) {
                return null
        }

        if (/^https?:\/\//i.test(uri)) {
                return uri
        }

        const origin = DOCUSIGN.BASE_URL.replace(/\/restapi$/i, '')
        const normalizedPath = uri.startsWith('/') ? uri : `/${uri}`

        return `${origin}${normalizedPath}`
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
                        signatureDocumentsUri: resolveDocuSignUri(summary.documentsUri),
                        signatureCertificateUri: resolveDocuSignUri(summary.certificateUri),
                        signatureEnvelopeSummary: summary as unknown as Prisma.InputJsonValue,
                        signatureRecipients: toStoredRecipientJson(storedRecipients),
                        signatureLastError: null
                }
        })
}

const enqueueDocuSignEnvelope = async (
        contractId: string,
        actor: ContractActor,
        payload?: TriggerDocuSignEnvelopeInput,
        options?: { skipAuthorization?: boolean }
) => {
        ensureDocuSignEnabled()

        const actorPayload = actor ? { id: actor.id, role: actor.role ?? null } : null

        if (!DOCUSIGN.QUEUE.ENABLED) {
                console.info('DocuSign queue đang tắt, gửi envelope ngay trong request', {
                        contractId,
                        actorId: actorPayload?.id ?? null,
                        skipAuthorization: options?.skipAuthorization ?? false
                })

                await triggerDocuSignEnvelope(contractId, actor, payload, options)
                return
        }

        const jobData: DocuSignEnvelopeJobData = {
                contractId,
                actor: actorPayload
        }

        if (payload) {
                jobData.payload = payload
        }

        if (options) {
                jobData.options = options
        }

        await docusignEnvelopeQueue.add('send-envelope', jobData)

        console.info('Đã xếp hàng job gửi DocuSign envelope', {
                contractId,
                actorId: actorPayload?.id ?? null,
                skipAuthorization: options?.skipAuthorization ?? false
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
        envelopeId: string
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

const normaliseEnvelopeDetails = (
        fallbackEnvelopeId: string,
        details?: DocuSignEnvelopeDetails | null
): DocuSignConnectEnvelope => {
        const normalized: DocuSignConnectEnvelope = {
                envelopeId: details?.envelopeId ?? fallbackEnvelopeId
        }

        if (details?.status !== undefined) {
                normalized.status = details.status
        }

        const statusDateTime =
                details?.completedDateTime ??
                details?.statusDateTime ??
                details?.deliveredDateTime ??
                details?.sentDateTime
        if (statusDateTime) {
                normalized.statusDateTime = statusDateTime
        }

        if (details?.documentsUri !== undefined) {
                normalized.documentsUri = details.documentsUri
        }

        if (details?.certificateUri !== undefined) {
                normalized.certificateUri = details.certificateUri
        }

        if (details?.recipients !== undefined) {
                normalized.recipients = details.recipients
        }

        if (details?.customFields !== undefined) {
                        normalized.customFields = details.customFields
        }

        return normalized
}

const mergeEnvelopePayload = (
        base: DocuSignConnectEnvelope,
        overrides?: DocuSignConnectEnvelope | null
): DocuSignConnectEnvelope => {
        const merged: DocuSignConnectEnvelope = {
                envelopeId: base.envelopeId
        }

        if (base.status !== undefined) {
                merged.status = base.status
        }
        if (base.statusDateTime !== undefined) {
                merged.statusDateTime = base.statusDateTime
        }
        if (base.documentsUri !== undefined) {
                merged.documentsUri = base.documentsUri
        }
        if (base.certificateUri !== undefined) {
                merged.certificateUri = base.certificateUri
        }
        if (base.recipients !== undefined) {
                merged.recipients = base.recipients
        }
        if (base.customFields !== undefined) {
                merged.customFields = base.customFields
        }

        if (!overrides) {
                return merged
        }

        merged.envelopeId = overrides.envelopeId ?? merged.envelopeId
        if (overrides.status !== undefined) {
                merged.status = overrides.status
        }
        if (overrides.statusDateTime !== undefined) {
                merged.statusDateTime = overrides.statusDateTime
        }
        if (overrides.documentsUri !== undefined) {
                merged.documentsUri = overrides.documentsUri
        }
        if (overrides.certificateUri !== undefined) {
                merged.certificateUri = overrides.certificateUri
        }
        if (overrides.recipients !== undefined) {
                merged.recipients = overrides.recipients
        }
        if (overrides.customFields !== undefined) {
                merged.customFields = overrides.customFields
        }

        return merged
}

const toConnectEnvelope = (candidate: unknown): DocuSignConnectEnvelope | null => {
        if (!candidate || typeof candidate !== 'object') {
                return null
        }

        const record = candidate as Record<string, unknown>
        const envelopeId = typeof record.envelopeId === 'string' ? record.envelopeId.trim() : ''
        if (!envelopeId) {
                return null
        }

        return { ...(candidate as DocuSignConnectEnvelope), envelopeId }
}

const extractEnvelopePayload = (payload: unknown): DocuSignConnectEnvelope | null => {
        if (!payload || typeof payload !== 'object') {
                return null
        }
        const record = payload as Record<string, unknown>

        const statusEnvelope = toConnectEnvelope(record.envelopeStatus)
        if (statusEnvelope) {
                return statusEnvelope
        }

        const dataEnvelope = toConnectEnvelope(record.data)
        if (dataEnvelope) {
                return dataEnvelope
        }

        return toConnectEnvelope(record)
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

const normaliseEventId = (value: unknown) =>
        typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const extractDocuSignEventId = (payload: unknown): string | null => {
        if (!payload || typeof payload !== 'object') {
                return null
        }

        const record = payload as Record<string, unknown>
        const notification = record.eventNotification ?? record.EventNotification

        if (notification && typeof notification === 'object') {
                const notificationRecord = notification as Record<string, unknown>
                return (
                        normaliseEventId(notificationRecord.eventId) ??
                        normaliseEventId(notificationRecord.EventId) ??
                        normaliseEventId(notificationRecord.EventID) ??
                        null
                )
        }

        return (
                normaliseEventId(record.eventId) ??
                normaliseEventId(record.EventId) ??
                normaliseEventId(record.EventID) ??
                normaliseEventId(record.eventGuid) ??
                null
        )
}

const persistDocuSignWebhookLog = async (payload: unknown) => {
        const eventId = extractDocuSignEventId(payload) ?? `evt_${randomUUID()}`

        try {
                await prismaClient.webhookEventLog.upsert({
                        where: { eventId },
                        update: { raw: payload as Prisma.InputJsonValue, processed: false, type: 'docusign.connect' },
                        create: { eventId, type: 'docusign.connect', raw: payload as Prisma.InputJsonValue }
                })
        } catch (error) {
                console.error('Không thể ghi log webhook DocuSign', { eventId, error })
        }

        return eventId
}

const markDocuSignWebhookProcessed = async (eventId: string | null) => {
        if (!eventId) {
                return
        }

        try {
                await prismaClient.webhookEventLog.update({
                        where: { eventId },
                        data: { processed: true }
                })
        } catch (error) {
                console.error('Không thể cập nhật trạng thái log webhook DocuSign', { eventId, error })
        }
}

const handleDocuSignConnectEvent = async (payload: unknown) => {
        if (!DOCUSIGN.ENABLED) {
                return false
        }

        const webhookLogId = await persistDocuSignWebhookLog(payload)
        const extractedEnvelope = extractEnvelopePayload(payload)
        if (!extractedEnvelope) {
                console.warn('DocuSign webhook không có envelopeId', { eventId: webhookLogId })
                return false
        }

        let envelope: DocuSignConnectEnvelope = extractedEnvelope

        console.info('Đã nhận webhook DocuSign', {
                eventId: webhookLogId,
                envelopeId: envelope.envelopeId,
                status: envelope.status ?? null
        })

        let hydratedEnvelope: DocuSignConnectEnvelope | null = null
        let attemptedHydration = false
        const hydrateEnvelope = async (reason: string) => {
                if (attemptedHydration) {
                        if (hydratedEnvelope) {
                                envelope = mergeEnvelopePayload(envelope, hydratedEnvelope)
                        }
                        return hydratedEnvelope
                }

                attemptedHydration = true
                try {
                        const details = await docusignService.getEnvelope(envelope.envelopeId, {
                                include: ['recipients', 'custom_fields', 'documents']
                        })
                        hydratedEnvelope = normaliseEnvelopeDetails(envelope.envelopeId, details)
                        envelope = mergeEnvelopePayload(envelope, hydratedEnvelope)
                        console.info('Đã bổ sung dữ liệu DocuSign từ API để xử lý webhook', {
                                eventId: webhookLogId,
                                envelopeId: envelope.envelopeId,
                                reason
                        })
                } catch (error) {
                        console.error('Không thể bổ sung dữ liệu DocuSign từ API', {
                                eventId: webhookLogId,
                                envelopeId: envelope.envelopeId,
                                reason,
                                error
                        })
                        hydratedEnvelope = null
                }

                return hydratedEnvelope
        }

        let contractId = await findContractForEnvelope(envelope.envelopeId, envelope.customFields)
        if (!contractId) {
                const fallback = await hydrateEnvelope('resolve-contract')
                if (fallback) {
                        contractId = await findContractForEnvelope(fallback.envelopeId, fallback.customFields)
                }
        }

        if (!contractId) {
                console.warn('DocuSign event không xác định được hợp đồng', {
                        eventId: webhookLogId,
                        envelopeId: envelope.envelopeId
                })
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

        if (!envelope.status || !envelope.recipients?.signers || !envelope.customFields) {
                await hydrateEnvelope('missing-fields')
        }

        const mappedStatus = mapDocuSignStatus(envelope.status ?? null)
        const storedRecipients = parseStoredRecipients(contractRecord.signatureRecipients)
        const signerStatuses = envelope.recipients?.signers ?? []
        const now = new Date()
        const normalizedContractPayload = {
                envelopeStatus: envelope
        } as Prisma.InputJsonValue

        await prismaClient.$transaction(async tx => {
                const updateData: Prisma.ContractUpdateInput = {
                        signatureEnvelopeSummary: normalizedContractPayload,
                        signatureDocumentsUri: resolveDocuSignUri(envelope.documentsUri),
                        signatureCertificateUri: resolveDocuSignUri(envelope.certificateUri)
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

        await markDocuSignWebhookProcessed(webhookLogId)

        console.info('Đã cập nhật trạng thái DocuSign từ webhook', {
                eventId: webhookLogId,
                contractId: contractRecord.id,
                envelopeId: envelope.envelopeId,
                status: mappedStatus ?? envelope.status ?? null
        })

        return true
}

const syncDocuSignEnvelopeStatus = async (
        contractId: string,
        actor: ContractActor,
        options?: { skipAuthorization?: boolean }
) => {
        ensureDocuSignEnabled()

        const contractRecord = await prismaClient.contract.findUnique({
                where: { id: contractId },
                select: {
                        id: true,
                        clientId: true,
                        freelancerId: true,
                        signatureProvider: true,
                        signatureEnvelopeId: true
                }
        })

        if (!contractRecord) {
                throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
        }

        ensureContractAccess(contractRecord, actor, options)

        if (contractRecord.signatureProvider !== ContractSignatureProvider.DOCUSIGN) {
                throw new BadRequestException('Hợp đồng này không dùng DocuSign', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (!contractRecord.signatureEnvelopeId) {
                throw new BadRequestException('Hợp đồng chưa có envelope DocuSign', ErrorCode.PARAM_QUERY_ERROR)
        }

        let envelopeDetails: DocuSignEnvelopeDetails | null = null

        try {
                envelopeDetails = await docusignService.getEnvelope(contractRecord.signatureEnvelopeId, {
                        include: ['recipients', 'custom_fields', 'documents']
                })
        } catch (error) {
                console.error('Không thể lấy thông tin envelope DocuSign', error)
                throw new BadRequestException('Không thể đồng bộ trạng thái DocuSign. Vui lòng thử lại sau.', ErrorCode.PARAM_QUERY_ERROR)
        }

        const normalizedPayload = {
                envelopeStatus: normaliseEnvelopeDetails(
                        contractRecord.signatureEnvelopeId,
                        envelopeDetails
                )
        }

        const handled = await handleDocuSignConnectEvent(normalizedPayload)

        if (!handled) {
                throw new BadRequestException('Không thể cập nhật trạng thái DocuSign từ API', ErrorCode.PARAM_QUERY_ERROR)
        }

        return true
}

const contractSignatureService = {
        isDocuSignEnabled: () => DOCUSIGN.ENABLED,
        enqueueDocuSignEnvelope,
        triggerDocuSignEnvelope,
        handleDocuSignConnectEvent,
        syncDocuSignEnvelopeStatus
}

export default contractSignatureService
