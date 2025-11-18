import jwt from 'jsonwebtoken'

import { DOCUSIGN } from '~/config/environment'

const DOCUSIGN_SCOPE = 'signature impersonation'

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '')
const normalisePath = (path: string) => {
        if (!path.startsWith('/')) {
                return `/${path}`
        }
        return path
}

type AccessTokenCache = {
        token: string
        expiresAt: number
}

let cachedToken: AccessTokenCache | null = null

const assertDocuSignConfigured = () => {
        if (!DOCUSIGN.ENABLED || !DOCUSIGN.PRIVATE_KEY) {
                throw new Error('DocuSign chưa được cấu hình đầy đủ')
        }
        if (!DOCUSIGN.INTEGRATION_KEY || !DOCUSIGN.USER_ID || !DOCUSIGN.ACCOUNT_ID) {
                throw new Error('Thiếu DocuSign credentials')
        }
}

const buildJwtAssertion = () => {
        assertDocuSignConfigured()

        const audience = new URL(DOCUSIGN.AUTH_SERVER).host
        const payload = {
                iss: DOCUSIGN.INTEGRATION_KEY!,
                sub: DOCUSIGN.USER_ID!,
                aud: audience,
                scope: DOCUSIGN_SCOPE
        }

        return jwt.sign(payload, DOCUSIGN.PRIVATE_KEY!, { algorithm: 'RS256', expiresIn: '10m' })
}

const buildConsentUrl = () => {
        const base = trimTrailingSlashes(DOCUSIGN.AUTH_SERVER)
        const params = new URLSearchParams({
                response_type: 'code',
                scope: DOCUSIGN_SCOPE,
                client_id: DOCUSIGN.INTEGRATION_KEY!,
                redirect_uri: DOCUSIGN.CONSENT_REDIRECT_URI
        })

        return `${base}/oauth/auth?${params.toString()}`
}

const fetchAccessToken = async (): Promise<string> => {
        const now = Date.now()
        if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
                return cachedToken.token
        }

        const assertion = buildJwtAssertion()
        const tokenUrl = `${trimTrailingSlashes(DOCUSIGN.AUTH_SERVER)}/oauth/token`
        const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                        assertion
                })
        })

	const body = await response.text()
	if (!response.ok) {
		let description = body
		try {
			const parsed = JSON.parse(body) as { error?: string; error_description?: string }
			if (parsed.error === 'consent_required') {
				const consentUrl = buildConsentUrl()
				throw new Error(
					'DocuSign yêu cầu cấp quyền (consent) cho ứng dụng JWT. ' +
						`Đăng nhập tài khoản DocuSign sandbox và mở URL sau để chấp thuận: ${consentUrl}`
				)
			}
			if (parsed.error_description) {
				description = parsed.error_description
			}
			if (parsed.error) {
				description = `${parsed.error}: ${description}`
			}
		} catch (error) {
			if (error instanceof Error && error.message.startsWith('DocuSign yêu cầu cấp quyền')) {
				throw error
			}
			// ignore JSON parse failure; fall back to body text
		}

		throw new Error(`DocuSign token request failed: ${response.status} ${description}`)
	}

        const parsed = body ? (JSON.parse(body) as { access_token: string; expires_in: number }) : null

        if (!parsed?.access_token) {
                throw new Error('DocuSign token response không hợp lệ')
        }

        cachedToken = {
                token: parsed.access_token,
                expiresAt: Date.now() + Math.max(0, (parsed.expires_in ?? 0) * 1000)
        }

        return cachedToken.token
}

const requestDocuSign = async <T = unknown>(path: string, init: RequestInit & { rawBody?: string } = {}) => {
        assertDocuSignConfigured()

        const token = await fetchAccessToken()
        const url = `${trimTrailingSlashes(DOCUSIGN.BASE_URL)}${normalisePath(path)}`
        const { rawBody, ...rest } = init
        const headers = new Headers(rest.headers)
        headers.set('authorization', `Bearer ${token}`)
        if (!headers.has('content-type')) {
                headers.set('content-type', 'application/json')
        }

        const fetchInit: RequestInit = {
                ...rest,
                headers
        }

        if (rawBody !== undefined) {
                fetchInit.body = rawBody
        }

        const response = await fetch(url, fetchInit)
        const text = await response.text()
        if (!response.ok) {
                throw new Error(`DocuSign API error ${response.status}: ${text}`)
        }

        if (!text) {
                return null as T
        }

        return JSON.parse(text) as T
}

export type DocuSignSignerDefinition = {
        name: string
        email: string
        recipientId: string
        routingOrder: string
        roleName?: string
        tabs?: Record<string, unknown>
}

export type DocuSignEnvelopeDefinition = {
        emailSubject: string
        emailBlurb?: string
        documents: Array<{
                documentBase64: string
                name: string
                documentId: string
                fileExtension?: string
        }>
        recipients: {
                signers: DocuSignSignerDefinition[]
        }
        customFields?: {
                textCustomFields?: Array<{ name: string; value: string; show?: 'true' | 'false' }>
        }
        status?: 'created' | 'sent'
}

export type DocuSignEnvelopeSummary = {
        envelopeId: string
        status?: string
        statusDateTime?: string
        documentsUri?: string
        recipientsUri?: string
        certificateUri?: string
}

const sendEnvelope = async (definition: DocuSignEnvelopeDefinition): Promise<DocuSignEnvelopeSummary> => {
        const payload = JSON.stringify({
                ...definition,
                status: definition.status ?? 'sent'
        })

        return requestDocuSign<DocuSignEnvelopeSummary>(
                `/v2.1/accounts/${DOCUSIGN.ACCOUNT_ID}/envelopes`,
                {
                        method: 'POST',
                        rawBody: payload
                }
        )
}

const voidEnvelope = async (envelopeId: string, reason?: string) => {
        const payload = JSON.stringify({
                status: 'voided',
                voidedReason: reason ?? 'Replaced by a new envelope'
        })

        await requestDocuSign(`/v2.1/accounts/${DOCUSIGN.ACCOUNT_ID}/envelopes/${envelopeId}`, {
                method: 'PUT',
                rawBody: payload
        })
}

const getEnvelope = async (envelopeId: string) => {
        return requestDocuSign(`/v2.1/accounts/${DOCUSIGN.ACCOUNT_ID}/envelopes/${envelopeId}`, {
                method: 'GET'
        })
}

const docusignService = {
        sendEnvelope,
        voidEnvelope,
        getEnvelope
}

export default docusignService
