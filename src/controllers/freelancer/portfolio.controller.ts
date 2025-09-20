import { type Express, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import {
        CreatePortfolioSchema,
        UpdatePortfolioSchema
} from '~/schema/portfolio.schema'
import portfolioService, {
        type PortfolioMediaUploads
} from '~/services/freelancer/portfolio.service'

type PortfolioFormBody = Record<string, unknown>

const asSingleString = (value: unknown): string | undefined => {
        if (value === undefined || value === null) return undefined
        if (Array.isArray(value)) {
                const last = value[value.length - 1]
                return typeof last === 'string' ? last : String(last)
        }
        return typeof value === 'string' ? value : String(value)
}

const normalizeNullableString = (value: unknown) => {
        const str = asSingleString(value)
        if (str === undefined) return undefined
        const trimmed = str.trim()
        if (trimmed.length === 0) return null
        if (trimmed.toLowerCase() === 'null') return null
        return trimmed
}

const normalizeNullableId = (value: unknown) => {
        const str = asSingleString(value)
        if (str === undefined) return undefined
        const trimmed = str.trim()
        if (trimmed.length === 0) return null
        const lower = trimmed.toLowerCase()
        if (lower === 'null') return null
        if (lower === 'undefined') return undefined
        return trimmed
}

const normalizeNullableDate = (value: unknown) => {
        const str = asSingleString(value)
        if (str === undefined) return undefined
        const trimmed = str.trim()
        if (trimmed.length === 0) return undefined
        if (trimmed.toLowerCase() === 'null') return null
        return trimmed
}

const normalizeEnumString = (value: unknown) => {
        const str = asSingleString(value)
        if (str === undefined) return undefined
        const trimmed = str.trim()
        return trimmed.length === 0 ? undefined : trimmed
}

const normalizeStringArray = (value: unknown): string[] | undefined => {
        if (value === undefined) return undefined
        const raw = Array.isArray(value) ? value : [value]
        const result: string[] = []

        for (const entry of raw) {
                if (typeof entry !== 'string') continue
                const trimmed = entry.trim()
                if (!trimmed) continue

                if (trimmed.toLowerCase() === 'null') {
                        continue
                }

                if (trimmed.startsWith('[')) {
                        try {
                                const parsed = JSON.parse(trimmed)
                                if (Array.isArray(parsed)) {
                                        for (const item of parsed) {
                                                if (typeof item === 'string') {
                                                        const piece = item.trim()
                                                        if (piece) result.push(piece)
                                                } else if (item !== null && item !== undefined) {
                                                        const piece = String(item).trim()
                                                        if (piece) result.push(piece)
                                                }
                                        }
                                        continue
                                }
                        } catch {
                                // ignore -> fallback to treat as plain string below
                        }
                }

                if (trimmed.includes(',')) {
                        const parts = trimmed.split(',').map(part => part.trim()).filter(Boolean)
                        if (parts.length > 0) {
                                result.push(...parts)
                                continue
                        }
                }

                result.push(trimmed)
        }

        if (result.length > 0) return result
        return []
}

const transformPortfolioBody = (body: PortfolioFormBody) => ({
        title: normalizeEnumString(body.title),
        role: normalizeNullableString(body.role),
        description: normalizeNullableString(body.description),
        projectUrl: normalizeNullableString(body.projectUrl),
        repositoryUrl: normalizeNullableString(body.repositoryUrl),
        visibility: normalizeEnumString(body.visibility),
        startedAt: normalizeNullableDate(body.startedAt),
        completedAt: normalizeNullableDate(body.completedAt),
        publishedAt: normalizeNullableDate(body.publishedAt),
        coverAssetId: normalizeNullableId(body.coverAssetId),
        galleryAssetIds: normalizeStringArray(body.galleryAssetIds),
        skillIds: normalizeStringArray(body.skillIds)
})

const extractPortfolioMedia = (req: Request): PortfolioMediaUploads => {
        const files = req.files
        const payload: PortfolioMediaUploads = { galleryFiles: [] }

        if (!files) {
                return payload
        }

        if (Array.isArray(files)) {
                payload.galleryFiles = files
                return payload
        }

        const dict = files as Record<string, Express.Multer.File[]>
        if (Array.isArray(dict.cover) && dict.cover.length > 0) {
                const [coverFile] = dict.cover
                if (coverFile) payload.coverFile = coverFile
        }
        if (Array.isArray(dict.gallery)) {
                payload.galleryFiles = dict.gallery
        }

        return payload
}

export const listPortfolios = async (req: Request, res: Response) => {
        const { freelancerId } = req.params
        if (!freelancerId) {
                throw new BadRequestException('Freelancer id không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
        }

        const includePrivate = req.user?.id === freelancerId
        const portfolios = await portfolioService.listPortfolios(freelancerId, includePrivate)

        return res.status(StatusCodes.OK).json(portfolios)
}

export const getPortfolioDetail = async (req: Request, res: Response) => {
        const { freelancerId, portfolioId } = req.params
        if (!freelancerId || !portfolioId) {
                throw new BadRequestException('Thiếu tham số truy vấn', ErrorCode.PARAM_QUERY_ERROR)
        }

        const includePrivate = req.user?.id === freelancerId
        const portfolio = await portfolioService.getPortfolioById(freelancerId, portfolioId, includePrivate)

        return res.status(StatusCodes.OK).json(portfolio)
}

const assertOwner = (freelancerId: string, userId?: string) => {
        if (!userId || userId !== freelancerId) {
                throw new UnauthorizedException('Bạn không có quyền thao tác portfolio này', ErrorCode.USER_NOT_AUTHORITY)
        }
}

export const createPortfolio = async (req: Request, res: Response) => {
        const { freelancerId } = req.params
        if (!freelancerId) {
                throw new BadRequestException('Freelancer id không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
        }

        assertOwner(freelancerId, req.user?.id)

        const payload = CreatePortfolioSchema.parse(transformPortfolioBody(req.body))
        const media = extractPortfolioMedia(req)
        const result = await portfolioService.createPortfolio(freelancerId, payload, req.user!.id, media)

        return res.status(StatusCodes.CREATED).json(result)
}

export const updatePortfolio = async (req: Request, res: Response) => {
        const { freelancerId, portfolioId } = req.params
        if (!freelancerId || !portfolioId) {
                throw new BadRequestException('Thiếu tham số truy vấn', ErrorCode.PARAM_QUERY_ERROR)
        }

        assertOwner(freelancerId, req.user?.id)

        const payload = UpdatePortfolioSchema.parse(transformPortfolioBody(req.body))
        const media = extractPortfolioMedia(req)
        const result = await portfolioService.updatePortfolio(
                freelancerId,
                portfolioId,
                payload,
                req.user!.id,
                media
        )

        return res.status(StatusCodes.OK).json(result)
}

export const deletePortfolio = async (req: Request, res: Response) => {
        const { freelancerId, portfolioId } = req.params
        if (!freelancerId || !portfolioId) {
                throw new BadRequestException('Thiếu tham số truy vấn', ErrorCode.PARAM_QUERY_ERROR)
        }

        assertOwner(freelancerId, req.user?.id)

        await portfolioService.deletePortfolio(freelancerId, portfolioId, req.user!.id)

        return res.status(StatusCodes.NO_CONTENT).send()
}
