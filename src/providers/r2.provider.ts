import { URL } from 'node:url'

import { R2_CONFIG } from '~/config/environment'

const REGION = R2_CONFIG.REGION || 'auto'
const FORCE_PATH_STYLE = (() => {
        const flag = process.env.R2_FORCE_PATH_STYLE
        if (flag === undefined) {
                return true
        }
        const normalized = flag.trim().toLowerCase()
        if (normalized === 'true') return true
        if (normalized === 'false') return false
        return true
})()

type S3Module = typeof import('@aws-sdk/client-s3')
type PresignerModule = typeof import('@aws-sdk/s3-request-presigner')

let s3ModulePromise: Promise<S3Module> | null = null
let presignerModulePromise: Promise<PresignerModule> | null = null
let cachedClient: any | null = null

const createDependencyError = (pkg: string, cause: unknown) =>
        new Error(`Không thể tải module "${pkg}". Hãy chạy \`npm install ${pkg}\` rồi thử lại.`, {
                cause
        })

const loadS3Module = async (): Promise<S3Module> => {
        if (!s3ModulePromise) {
                s3ModulePromise = import('@aws-sdk/client-s3').catch(error => {
                        s3ModulePromise = null
                        throw createDependencyError('@aws-sdk/client-s3', error)
                })
        }
        return s3ModulePromise
}

const loadPresignerModule = async (): Promise<PresignerModule> => {
        if (!presignerModulePromise) {
                presignerModulePromise = import('@aws-sdk/s3-request-presigner').catch(error => {
                        presignerModulePromise = null
                        throw createDependencyError('@aws-sdk/s3-request-presigner', error)
                })
        }
        return presignerModulePromise
}

const stripBucketFromEndpoint = (endpoint: string) => {
        if (!R2_CONFIG.BUCKET) {
                return endpoint
        }

        const bucket = R2_CONFIG.BUCKET.trim()
        if (!bucket) {
                return endpoint
        }

        const suffix = `/${bucket}`
        if (endpoint.endsWith(suffix)) {
                return endpoint.slice(0, -suffix.length)
        }

        return endpoint
}

const getEndpoint = () => {
        const endpoint =
                R2_CONFIG.ENDPOINT || (R2_CONFIG.ACCOUNT_ID ? `https://${R2_CONFIG.ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined)
        if (!endpoint) {
                throw new Error('R2 endpoint is not configured. Please set R2_ENDPOINT or R2_ACCOUNT_ID.')
        }

        const trimmed = endpoint.replace(/\/$/, '')
        return stripBucketFromEndpoint(trimmed)
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

const getClient = async (): Promise<any> => {
        if (cachedClient) {
                return cachedClient
        }
        const { S3Client } = await loadS3Module()
        cachedClient = new S3Client({
                region: REGION,
                endpoint: getEndpoint(),
                credentials: getCredentials(),
                forcePathStyle: FORCE_PATH_STYLE
        })
        return cachedClient
}

const encodeRfc3986 = (value: string) =>
        encodeURIComponent(value).replace(/[!'()*]/g, ch => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`)

const encodeS3Key = (key: string) => key.split('/').map(encodeRfc3986).join('/')

const normalizeCustomBase = (input: string) => {
        try {
                const parsed = new URL(input)
                const host = parsed.host.toLowerCase()
                const isS3Host = host.endsWith('.r2.cloudflarestorage.com')
                if (isS3Host) {
                        return null
                }

                const normalizedPath = parsed.pathname.replace(/\/$/, '')
                return `${parsed.origin}${normalizedPath}`
        } catch (_error) {
                if (!input.includes('://')) {
                        return input.replace(/\/$/, '')
                }

                return null
        }
}

const buildObjectUrl = (bucket: string, key: string) => {
        const encodedKey = encodeS3Key(key)

        const customBase = R2_CONFIG.PUBLIC_BASE_URL?.trim()
        if (customBase) {
                const normalized = normalizeCustomBase(customBase)
                if (normalized) {
                        return `${normalized}/${encodedKey}`
                }
        }

        if (R2_CONFIG.ACCOUNT_ID) {
                const publicOrigin = `https://pub-${R2_CONFIG.ACCOUNT_ID}.r2.dev`
                return `${publicOrigin}/${encodeRfc3986(bucket)}/${encodedKey}`
        }

        const endpoint = getEndpoint()
        if (endpoint.endsWith(`/${bucket}`)) {
                return `${endpoint}/${encodedKey}`
        }

        return `${endpoint}/${encodeRfc3986(bucket)}/${encodedKey}`
}

export type R2UploadResult = {
        bucket: string
        key: string
        url: string
        eTag?: string
}

export const uploadBufferToR2 = async (
        buffer: Buffer,
        options: { key: string; bucket?: string; contentType?: string }
): Promise<R2UploadResult> => {
        const bucket = options.bucket || R2_CONFIG.BUCKET
        if (!bucket) {
                throw new Error('R2 bucket is not configured. Please set R2_BUCKET.')
        }

        const client = await getClient()
        const { PutObjectCommand } = await loadS3Module()

        const result = await client.send(
                new PutObjectCommand({
                        Bucket: bucket,
                        Key: options.key,
                        Body: buffer,
                        ContentType: options.contentType
                })
        )

        return {
                bucket,
                key: options.key,
                url: buildObjectUrl(bucket, options.key),
                eTag: typeof result?.ETag === 'string' ? result.ETag.replace(/"/g, '') : undefined
        }
}

export const deleteR2Object = async (bucket: string, key: string) => {
        if (!bucket || !key) return

        try {
                const client = await getClient()
                const { DeleteObjectCommand } = await loadS3Module()
                await client.send(
                        new DeleteObjectCommand({
                                Bucket: bucket,
                                Key: key
                        })
                )
        } catch (error) {
                // eslint-disable-next-line no-console
                console.error('deleteR2Object error', error)
        }
}

export const getR2ObjectStream = async (bucket: string, key: string) => {
        const client = await getClient()
        const { GetObjectCommand } = await loadS3Module()
        const response = await client.send(
                new GetObjectCommand({
                        Bucket: bucket,
                        Key: key
                })
        )
        return response.Body ?? null
}

export const createPresignedUploadUrl = async (
        key: string,
        options: { bucket?: string; expiresIn?: number; contentType?: string } = {}
) => {
        const bucket = options.bucket || R2_CONFIG.BUCKET
        if (!bucket) {
                throw new Error('R2 bucket is not configured. Please set R2_BUCKET.')
        }

        const client = await getClient()
        const [{ PutObjectCommand }, { getSignedUrl }] = await Promise.all([loadS3Module(), loadPresignerModule()])

        return getSignedUrl(
                client,
                new PutObjectCommand({
                        Bucket: bucket,
                        Key: key,
                        ContentType: options.contentType
                }),
                { expiresIn: options.expiresIn ?? 3600 }
        )
}
