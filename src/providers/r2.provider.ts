import { createHash, createHmac } from 'node:crypto'
import { URL } from 'node:url'

import { R2_CONFIG } from '~/config/environment'

const SERVICE = 's3'
const REGION = R2_CONFIG.REGION || 'auto'

const getEndpoint = () => {
	const endpoint =
		R2_CONFIG.ENDPOINT ||
		(R2_CONFIG.ACCOUNT_ID ? `https://${R2_CONFIG.ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined)
	if (!endpoint) {
		throw new Error('R2 endpoint is not configured. Please set R2_ENDPOINT or R2_ACCOUNT_ID.')
	}
	return endpoint.replace(/\/$/, '')
}

const getCredentials = () => {
	if (!R2_CONFIG.ACCESS_KEY_ID || !R2_CONFIG.SECRET_ACCESS_KEY) {
		throw new Error('R2 credentials are not configured. Please set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.')
	}
	return {
		accessKeyId: R2_CONFIG.ACCESS_KEY_ID,
		secretAccessKey: R2_CONFIG.SECRET_ACCESS_KEY
	}
}

const encodeRfc3986 = (value: string) =>
	encodeURIComponent(value).replace(/[!'()*]/g, ch => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`)

const encodeS3Key = (key: string) => key.split('/').map(encodeRfc3986).join('/')

const toAmzDate = (date: Date) => {
	const yyyy = date.getUTCFullYear()
	const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
	const dd = String(date.getUTCDate()).padStart(2, '0')
	const hh = String(date.getUTCHours()).padStart(2, '0')
	const min = String(date.getUTCMinutes()).padStart(2, '0')
	const ss = String(date.getUTCSeconds()).padStart(2, '0')
	return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`
}

const toDateStamp = (date: Date) => {
	const yyyy = date.getUTCFullYear()
	const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
	const dd = String(date.getUTCDate()).padStart(2, '0')
	return `${yyyy}${mm}${dd}`
}

const hashHex = (input: Buffer | string) => createHash('sha256').update(input).digest('hex')

const getSigningKey = (secretKey: string, dateStamp: string) => {
	const kDate = createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest()
	const kRegion = createHmac('sha256', kDate).update(REGION).digest()
	const kService = createHmac('sha256', kRegion).update(SERVICE).digest()
	return createHmac('sha256', kService).update('aws4_request').digest()
}

type SignedRequestParams = {
	method: 'PUT' | 'DELETE'
	bucket: string
	key: string
	body?: Buffer
	contentType?: string
}

const signRequest = (params: SignedRequestParams) => {
	const credentials = getCredentials()
	const endpoint = new URL(getEndpoint())
	const now = new Date()
	const amzDate = toAmzDate(now)
	const dateStamp = toDateStamp(now)
	const bodyHash = params.body ? hashHex(params.body) : hashHex('')

	const host = endpoint.host
	const canonicalUri = `/${encodeRfc3986(params.bucket)}/${encodeS3Key(params.key)}`

	const headers: Record<string, string> = {
		host,
		'x-amz-content-sha256': bodyHash,
		'x-amz-date': amzDate
	}

	if (params.contentType) {
		headers['content-type'] = params.contentType
	}

	const sortedHeaderNames = Object.keys(headers)
		.map(name => name.toLowerCase())
		.sort()
	const canonicalHeaders = sortedHeaderNames
		.map(name => {
			const raw = headers[name]
			const value = raw === undefined ? '' : raw.trim().replace(/\s+/g, ' ')
			return `${name}:${value}`
		})
		.join('\n')
	const signedHeaders = sortedHeaderNames.join(';')

	const canonicalRequest = [params.method, canonicalUri, '', `${canonicalHeaders}\n`, signedHeaders, bodyHash].join(
		'\n'
	)

	const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`
	const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, hashHex(canonicalRequest)].join('\n')

	const signingKey = getSigningKey(credentials.secretAccessKey, dateStamp)
	const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')

	const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

	const finalHeaders: Record<string, string> = {}
	for (const name of sortedHeaderNames) {
		const value = headers[name]
		if (value !== undefined) {
			finalHeaders[name] = value
		}
	}
	finalHeaders.Authorization = authorization

	return {
		url: `${endpoint.protocol}//${host}${canonicalUri}`,
		headers: finalHeaders,
		bodyHash
	}
}

const buildObjectUrl = (bucket: string, key: string) => {
	const custom = R2_CONFIG.PUBLIC_BASE_URL?.replace(/\/$/, '')
	if (custom) {
		return `${custom}/${key}`
	}

	const endpoint = getEndpoint()
	if (endpoint.endsWith(`/${bucket}`)) {
		return `${endpoint}/${key}`
	}
	return `${endpoint}/${bucket}/${key}`
}

export type R2UploadResult = {
	bucket: string
	key: string
	url: string
}

export const uploadBufferToR2 = async (
	buffer: Buffer,
	options: { key: string; bucket?: string; contentType?: string }
): Promise<R2UploadResult> => {
	const bucket = options.bucket || R2_CONFIG.BUCKET
	if (!bucket) {
		throw new Error('R2 bucket is not configured. Please set R2_BUCKET.')
	}

	const signedParams: SignedRequestParams = {
		method: 'PUT',
		bucket,
		key: options.key,
		body: buffer
	}

	if (options.contentType) {
		signedParams.contentType = options.contentType
	}

	const { url, headers } = signRequest(signedParams)

	const response = await fetch(url, {
		method: 'PUT',
		headers,
		body: buffer as any
	})

	if (!response.ok) {
		console.log(response)
		throw new Error(`Failed to upload object to R2: ${response.status} ${response.statusText}`)
	}

	return {
		bucket,
		key: options.key,
		url: buildObjectUrl(bucket, options.key)
	}
}

export const deleteR2Object = async (bucket: string, key: string) => {
	if (!bucket || !key) return

	try {
		const { url, headers } = signRequest({ method: 'DELETE', bucket, key })
		const response = await fetch(url, {
			method: 'DELETE',
			headers
		})
		if (!response.ok && response.status !== 404) {
			throw new Error(`Failed to delete R2 object: ${response.status} ${response.statusText}`)
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('deleteR2Object error', error)
	}
}
