import type { Express } from 'express'
import { CLOUDINARY_CONFIG_INFO } from '~/config/environment'
import { prismaClient } from '~/config/prisma-client'
import {
        AssetKind,
        AssetOwnerType,
        AssetProvider,
        AssetRole,
        AssetStatus,
        PortfolioVisibility,
        Prisma
} from '~/generated/prisma'
import { uploadBufferToCloudinary, destroyCloudinary } from '~/providers/cloudinaryProvider.provider'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { CreatePortfolioInput, UpdatePortfolioInput } from '~/schema/portfolio.schema'

const OWNER_TYPE = AssetOwnerType.PORTFOLIO

type TransactionClient = Parameters<
        Extract<Parameters<typeof prismaClient.$transaction>[0], (client: any) => unknown>
>[0]

export type PortfolioMediaUploads = {
        coverFile?: Express.Multer.File
        galleryFiles?: Express.Multer.File[]
}

type CloudinaryUploadResult = {
        public_id: string
        secure_url?: string
        url?: string
        bytes?: number
        width?: number
        height?: number
        format?: string
        resource_type?: string
        folder?: string
        duration?: number
        asset_id?: string
}

type UploadedMedia = {
        file: Express.Multer.File
        upload: CloudinaryUploadResult
}

type UploadedPortfolioMedia = {
        cover?: UploadedMedia
        gallery: UploadedMedia[]
}

type AssetRemovalCandidate = {
        assetId: string
        provider: AssetProvider | null
        publicId: string | null
        mimeType: string | null
}

const portfolioInclude = {
        skills: {
                include: {
                        skill: true
                }
        }
} as const

const uniquePreserveOrder = (ids: readonly string[]) => {
        const seen = new Set<string>()
        const result: string[] = []
        for (const id of ids) {
                if (seen.has(id)) continue
                seen.add(id)
                result.push(id)
        }
        return result
}

const determineAssetKind = (mime: string): AssetKind =>
        mime.startsWith('image/') ? AssetKind.IMAGE : mime.startsWith('video/') ? AssetKind.VIDEO : AssetKind.FILE

const portfolioFolderForFreelancer = (freelancerId: string) => {
        const base = CLOUDINARY_CONFIG_INFO.PORTFOLIO_FOLDER || 'portfolio'
        return [base, freelancerId].filter(Boolean).join('/')
}

const cleanupUploadedMedia = async (uploaded: UploadedPortfolioMedia) => {
        const tasks: Promise<unknown>[] = []
        if (uploaded.cover?.upload.public_id) {
                tasks.push(destroyCloudinary(uploaded.cover.upload.public_id, uploaded.cover.file.mimetype))
        }
        for (const item of uploaded.gallery) {
                if (item.upload.public_id) {
                        tasks.push(destroyCloudinary(item.upload.public_id, item.file.mimetype))
                }
        }
        if (tasks.length > 0) {
                await Promise.allSettled(tasks)
        }
}

const cleanupRemovedAssets = async (assets: readonly AssetRemovalCandidate[]) => {
        const tasks: Promise<unknown>[] = []

        for (const asset of assets) {
                if (asset.provider === AssetProvider.CLOUDINARY && asset.publicId) {
                        tasks.push(destroyCloudinary(asset.publicId, asset.mimeType ?? undefined))
                }
        }

        if (tasks.length > 0) {
                await Promise.allSettled(tasks)
        }
}

const uploadPortfolioMediaFiles = async (
        freelancerId: string,
        media?: PortfolioMediaUploads
): Promise<UploadedPortfolioMedia> => {
        const folder = portfolioFolderForFreelancer(freelancerId)
        const uploaded: UploadedPortfolioMedia = { gallery: [] }

        if (!media) return uploaded

        try {
                if (media.coverFile) {
                        uploaded.cover = {
                                file: media.coverFile,
                                upload: (await uploadBufferToCloudinary(media.coverFile.buffer, {
                                        folder,
                                        mime: media.coverFile.mimetype
                                })) as CloudinaryUploadResult
                        }
                }

                for (const file of media.galleryFiles ?? []) {
                        uploaded.gallery.push({
                                file,
                                upload: (await uploadBufferToCloudinary(file.buffer, {
                                        folder,
                                        mime: file.mimetype
                                })) as CloudinaryUploadResult
                        })
                }

                return uploaded
        } catch (error) {
                await cleanupUploadedMedia(uploaded)
                throw error
        }
}

const createAssetFromUpload = async (
        tx: TransactionClient,
        item: UploadedMedia,
        actorId: string
): Promise<string> => {
        const meta: Prisma.JsonObject = {
                originalName: item.file.originalname
        }
        if (item.upload.format) meta.format = item.upload.format
        if (item.upload.resource_type) meta.resourceType = item.upload.resource_type
        if (item.upload.folder) meta.folder = item.upload.folder
        if (item.upload.duration !== undefined) meta.duration = item.upload.duration
        if (item.upload.asset_id) meta.assetId = item.upload.asset_id

        const asset = await tx.asset.create({
                data: {
                        provider: AssetProvider.CLOUDINARY,
                        kind: determineAssetKind(item.file.mimetype),
                        publicId: item.upload.public_id,
                        url: item.upload.secure_url ?? item.upload.url ?? null,
                        mimeType: item.file.mimetype,
                        bytes: item.upload.bytes ?? item.file.size ?? null,
                        width: item.upload.width ?? null,
                        height: item.upload.height ?? null,
                        createdBy: actorId,
                        status: AssetStatus.READY,
                        meta
                }
        })

        return asset.id
}

type PortfolioWithSkills = Prisma.PortfolioProjectGetPayload<{ include: typeof portfolioInclude }>

type AssetLinkWithAsset = Prisma.AssetLinkGetPayload<{
        include: { asset: true }
}>

type PortfolioAssetView = {
        id: string
        assetId: string
        role: AssetRole
        position: number
        label: string | null
        caption: string | null
        isPrimary: boolean
        createdAt: Date
        asset: {
                id: string
                kind: AssetKind
                url: string | null
                publicId: string | null
                mimeType: string | null
                width: number | null
                height: number | null
                bytes: number | null
        }
}

type PortfolioView = {
        id: string
        freelancerId: string
        title: string
        role: string | null
        description: string | null
        projectUrl: string | null
        repositoryUrl: string | null
        visibility: PortfolioVisibility
        startedAt: Date | null
        completedAt: Date | null
        publishedAt: Date | null
        createdAt: Date
        updatedAt: Date
        skills: { id: string; name: string; slug: string }[]
        coverAsset: PortfolioAssetView | null
        galleryAssets: PortfolioAssetView[]
}

const ensureFreelancerExists = async (freelancerId: string) => {
        const freelancer = await prismaClient.freelancer.findUnique({
                where: { userId: freelancerId }
        })

        if (!freelancer) {
                throw new NotFoundException('Freelancer không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }
}

const validateSkillIds = async (skillIds?: readonly string[]) => {
        if (!skillIds || skillIds.length === 0) return [] as string[]

        const unique = uniquePreserveOrder(skillIds)
        const existing = await prismaClient.skill.findMany({
                where: { id: { in: unique } },
                select: { id: true }
        })

        if (existing.length !== unique.length) {
                throw new NotFoundException('Kỹ năng không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return unique
}

const validateAssetIds = async (assetIds: Set<string>) => {
        if (assetIds.size === 0) return

        const existing = await prismaClient.asset.findMany({
                where: { id: { in: Array.from(assetIds) } },
                select: { id: true }
        })

        if (existing.length !== assetIds.size) {
                throw new NotFoundException('Tài nguyên không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }
}

const setPortfolioSkills = async (tx: TransactionClient, portfolioId: string, skillIds: string[]) => {
        await tx.portfolioSkill.deleteMany({
                where: { portfolioId }
        })

        if (skillIds.length === 0) return

        await tx.portfolioSkill.createMany({
                data: skillIds.map(skillId => ({ portfolioId, skillId }))
        })
}

const syncPortfolioAssets = async (
        tx: TransactionClient,
        portfolioId: string,
        payload: { coverAssetId?: string | null; galleryAssetIds?: readonly string[] },
        actorId?: string
) => {
        const createdBy = actorId ?? null

        if (payload.coverAssetId !== undefined) {
                if (payload.coverAssetId === null) {
                        await tx.assetLink.deleteMany({
                                where: {
                                        ownerType: OWNER_TYPE,
                                        ownerId: portfolioId,
                                        role: AssetRole.COVER
                                }
                        })
                } else {
                        await tx.assetLink.upsert({
                                where: {
                                        ownerType_ownerId_role_position: {
                                                ownerType: OWNER_TYPE,
                                                ownerId: portfolioId,
                                                role: AssetRole.COVER,
                                                position: 0
                                        }
                                },
                                update: {
                                        assetId: payload.coverAssetId,
                                        createdBy,
                                        isPrimary: true
                                },
                                create: {
                                        ownerType: OWNER_TYPE,
                                        ownerId: portfolioId,
                                        role: AssetRole.COVER,
                                        position: 0,
                                        assetId: payload.coverAssetId,
                                        createdBy,
                                        isPrimary: true
                                }
                        })
                }
        }

        if (payload.galleryAssetIds !== undefined) {
                await tx.assetLink.deleteMany({
                        where: {
                                ownerType: OWNER_TYPE,
                                ownerId: portfolioId,
                                role: AssetRole.GALLERY
                        }
                })

                if (payload.galleryAssetIds.length > 0) {
                        await tx.assetLink.createMany({
                                data: payload.galleryAssetIds.map((assetId, index) => ({
                                        ownerType: OWNER_TYPE,
                                        ownerId: portfolioId,
                                        role: AssetRole.GALLERY,
                                        position: index,
                                        assetId,
                                        createdBy,
                                        isPrimary: index === 0
                                }))
                        })
                }
        }
}

const formatAssetLink = (link: AssetLinkWithAsset): PortfolioAssetView => ({
        id: link.id,
        assetId: link.assetId,
        role: link.role,
        position: link.position,
        label: link.label ?? null,
        caption: link.caption ?? null,
        isPrimary: link.isPrimary,
        createdAt: link.createdAt,
        asset: {
                id: link.asset.id,
                kind: link.asset.kind,
                url: link.asset.url ?? null,
                publicId: link.asset.publicId ?? null,
                mimeType: link.asset.mimeType ?? null,
                width: link.asset.width ?? null,
                height: link.asset.height ?? null,
                bytes: link.asset.bytes ?? null
        }
})

const hydratePortfolios = async (portfolios: PortfolioWithSkills[]): Promise<PortfolioView[]> => {
        if (portfolios.length === 0) return []

        const assetLinks = await prismaClient.assetLink.findMany({
                where: {
                        ownerType: OWNER_TYPE,
                        ownerId: { in: portfolios.map(p => p.id) }
                },
                orderBy: { position: 'asc' },
                include: { asset: true }
        })

        const grouped = new Map<string, { cover: PortfolioAssetView | null; gallery: PortfolioAssetView[] }>()

        for (const link of assetLinks) {
                const bucket = grouped.get(link.ownerId) ?? { cover: null, gallery: [] }
                if (link.role === AssetRole.COVER) {
                        bucket.cover = formatAssetLink(link)
                }
                if (link.role === AssetRole.GALLERY) {
                        bucket.gallery.push(formatAssetLink(link))
                }
                grouped.set(link.ownerId, bucket)
        }

        return portfolios.map(portfolio => {
                const assets = grouped.get(portfolio.id) ?? { cover: null, gallery: [] }
                return {
                        id: portfolio.id,
                        freelancerId: portfolio.freelancerId,
                        title: portfolio.title,
                        role: portfolio.role ?? null,
                        description: portfolio.description ?? null,
                        projectUrl: portfolio.projectUrl ?? null,
                        repositoryUrl: portfolio.repositoryUrl ?? null,
                        visibility: portfolio.visibility,
                        startedAt: portfolio.startedAt ?? null,
                        completedAt: portfolio.completedAt ?? null,
                        publishedAt: portfolio.publishedAt ?? null,
                        createdAt: portfolio.createdAt,
                        updatedAt: portfolio.updatedAt,
                        skills: portfolio.skills.map(relation => ({
                                id: relation.skill.id,
                                name: relation.skill.name,
                                slug: relation.skill.slug
                        })),
                        coverAsset: assets.cover,
                        galleryAssets: assets.gallery
                }
        })
}

const listPortfolios = async (
        freelancerId: string,
        includePrivate: boolean,
        visibilityFilter?: PortfolioVisibility
): Promise<PortfolioView[]> => {
        await ensureFreelancerExists(freelancerId)

        const where: Prisma.PortfolioProjectWhereInput = { freelancerId }

        if (visibilityFilter) {
                where.visibility = visibilityFilter
        } else if (!includePrivate) {
                where.visibility = PortfolioVisibility.PUBLIC
        }

        const portfolios = await prismaClient.portfolioProject.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: portfolioInclude
        })

        return hydratePortfolios(portfolios)
}

const getPortfolioById = async (
        freelancerId: string,
        portfolioId: string,
        includePrivate: boolean
): Promise<PortfolioView> => {
        const portfolio = await prismaClient.portfolioProject.findFirst({
                where: {
                        id: portfolioId,
                        freelancerId,
                        ...(includePrivate ? {} : { visibility: PortfolioVisibility.PUBLIC })
                },
                include: portfolioInclude
        })

        if (!portfolio) {
                throw new NotFoundException('Portfolio không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        const [result] = await hydratePortfolios([portfolio])
        if (!result) {
                throw new NotFoundException('Portfolio không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }
        return result
}

const createPortfolio = async (
        freelancerId: string,
        data: CreatePortfolioInput,
        actorId: string,
        media: PortfolioMediaUploads = {}
): Promise<PortfolioView> => {
        await ensureFreelancerExists(freelancerId)

        const skillIds = await validateSkillIds(data.skillIds)
        const hasGalleryIdsInPayload = data.galleryAssetIds !== undefined
        const galleryAssetIds = hasGalleryIdsInPayload
                ? uniquePreserveOrder(data.galleryAssetIds ?? [])
                : []
        const assetIds = new Set<string>()

        if (data.coverAssetId) assetIds.add(data.coverAssetId)
        for (const assetId of galleryAssetIds) assetIds.add(assetId)
        await validateAssetIds(assetIds)

        const uploads = await uploadPortfolioMediaFiles(freelancerId, media)

        const visibility = data.visibility ?? PortfolioVisibility.PUBLIC
        const explicitPublishedAt = data.publishedAt ?? null
        const publishedAt =
                explicitPublishedAt !== null || data.publishedAt === null
                        ? explicitPublishedAt
                        : visibility === PortfolioVisibility.PUBLIC
                        ? new Date()
                        : null

        try {
                const created = await prismaClient.$transaction(async (tx: TransactionClient) => {
                        const createdPortfolio = await tx.portfolioProject.create({
                                data: {
                                        freelancerId,
                                        title: data.title,
                                        role: data.role ?? null,
                                        description: data.description ?? null,
                                        projectUrl: data.projectUrl ?? null,
                                        repositoryUrl: data.repositoryUrl ?? null,
                                        visibility,
                                        startedAt: data.startedAt ?? null,
                                        completedAt: data.completedAt ?? null,
                                        publishedAt
                                }
                        })

                        if (skillIds.length > 0) {
                                await tx.portfolioSkill.createMany({
                                        data: skillIds.map(skillId => ({ portfolioId: createdPortfolio.id, skillId }))
                                })
                        }

                        let coverAssetIdFromUploads: string | undefined
                        if (uploads.cover) {
                                coverAssetIdFromUploads = await createAssetFromUpload(tx, uploads.cover, actorId)
                        }

                        const newGalleryAssetIds: string[] = []
                        for (const item of uploads.gallery) {
                                const id = await createAssetFromUpload(tx, item, actorId)
                                newGalleryAssetIds.push(id)
                        }

                        const assetPayload: { coverAssetId?: string | null; galleryAssetIds?: readonly string[] } = {}

                        if (uploads.cover && coverAssetIdFromUploads) {
                                assetPayload.coverAssetId = coverAssetIdFromUploads
                        } else if (data.coverAssetId !== undefined) {
                                assetPayload.coverAssetId = data.coverAssetId
                        }

                        if (uploads.gallery.length > 0 || hasGalleryIdsInPayload) {
                                const baseGallery = hasGalleryIdsInPayload ? [...galleryAssetIds] : []
                                const combined = uniquePreserveOrder([...baseGallery, ...newGalleryAssetIds])
                                const coverIdForFilter = uploads.cover
                                        ? coverAssetIdFromUploads ?? undefined
                                        : typeof data.coverAssetId === 'string'
                                        ? data.coverAssetId
                                        : undefined
                                assetPayload.galleryAssetIds = coverIdForFilter
                                        ? combined.filter(id => id !== coverIdForFilter)
                                        : combined
                        }

                        await syncPortfolioAssets(tx, createdPortfolio.id, assetPayload, actorId)

                        return createdPortfolio
                })

                return getPortfolioById(freelancerId, created.id, true)
        } catch (error) {
                await cleanupUploadedMedia(uploads)
                throw error
        }
}

const updatePortfolio = async (
        freelancerId: string,
        portfolioId: string,
        data: UpdatePortfolioInput,
        actorId: string,
        media: PortfolioMediaUploads = {}
): Promise<PortfolioView> => {
        const existing = await prismaClient.portfolioProject.findFirst({
                where: { id: portfolioId, freelancerId },
                include: portfolioInclude
        })

        if (!existing) {
                throw new NotFoundException('Portfolio không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        const existingAssetLinks = await prismaClient.assetLink.findMany({
                where: {
                        ownerType: OWNER_TYPE,
                        ownerId: existing.id
                },
                include: { asset: true }
        })

        const skillIds = data.skillIds !== undefined ? await validateSkillIds(data.skillIds) : undefined
        const hasGalleryIdsInPayload = data.galleryAssetIds !== undefined
        const galleryAssetIds = hasGalleryIdsInPayload
                ? uniquePreserveOrder(data.galleryAssetIds ?? [])
                : undefined

        const assetIds = new Set<string>()
        if (typeof data.coverAssetId === 'string') assetIds.add(data.coverAssetId)
        if (galleryAssetIds) {
                for (const assetId of galleryAssetIds) assetIds.add(assetId)
        }
        await validateAssetIds(assetIds)

        const nextStartedAt = data.startedAt !== undefined ? data.startedAt ?? null : existing.startedAt
        const nextCompletedAt = data.completedAt !== undefined ? data.completedAt ?? null : existing.completedAt

        if (nextStartedAt && nextCompletedAt && nextStartedAt > nextCompletedAt) {
                throw new BadRequestException('startedAt phải nhỏ hơn hoặc bằng completedAt', ErrorCode.PARAM_QUERY_ERROR)
        }

        const updateData: Prisma.PortfolioProjectUpdateInput = {}

        if (data.title !== undefined) updateData.title = data.title
        if (data.role !== undefined) updateData.role = data.role ?? null
        if (data.description !== undefined) updateData.description = data.description ?? null
        if (data.projectUrl !== undefined) updateData.projectUrl = data.projectUrl ?? null
        if (data.repositoryUrl !== undefined) updateData.repositoryUrl = data.repositoryUrl ?? null
        if (data.startedAt !== undefined) updateData.startedAt = data.startedAt ?? null
        if (data.completedAt !== undefined) updateData.completedAt = data.completedAt ?? null
        if (data.visibility !== undefined) updateData.visibility = data.visibility

        let nextPublishedAt = existing.publishedAt
        const hasExplicitPublishedAt = data.publishedAt !== undefined
        if (hasExplicitPublishedAt) {
                nextPublishedAt = data.publishedAt ?? null
        }
        if (data.visibility !== undefined) {
                if (data.visibility === PortfolioVisibility.PUBLIC) {
                        if (!nextPublishedAt) {
                                nextPublishedAt = new Date()
                        }
                } else {
                        nextPublishedAt = null
                }
        }
        if (hasExplicitPublishedAt || data.visibility !== undefined) {
                updateData.publishedAt = nextPublishedAt
        }

        const uploads = await uploadPortfolioMediaFiles(freelancerId, media)

        let assetsPendingRemoval: AssetRemovalCandidate[] = []

        try {
                await prismaClient.$transaction(async (tx: TransactionClient) => {
                        await tx.portfolioProject.update({
                                where: { id: existing.id },
                                data: updateData
                        })

                        if (skillIds !== undefined) {
                                await setPortfolioSkills(tx, existing.id, skillIds)
                        }

                        let coverAssetIdFromUploads: string | undefined
                        if (uploads.cover) {
                                coverAssetIdFromUploads = await createAssetFromUpload(tx, uploads.cover, actorId)
                        }

                        const newGalleryAssetIds: string[] = []
                        for (const item of uploads.gallery) {
                                const id = await createAssetFromUpload(tx, item, actorId)
                                newGalleryAssetIds.push(id)
                        }

                        const shouldUpdateCover = uploads.cover !== undefined || data.coverAssetId !== undefined
                        const shouldUpdateGallery = uploads.gallery.length > 0 || hasGalleryIdsInPayload

                        const assetPayload: { coverAssetId?: string | null; galleryAssetIds?: readonly string[] } = {}

                        if (shouldUpdateCover) {
                                if (uploads.cover && coverAssetIdFromUploads) {
                                        assetPayload.coverAssetId = coverAssetIdFromUploads
                                } else {
                                        assetPayload.coverAssetId = data.coverAssetId ?? null
                                }
                        }

                        if (shouldUpdateGallery) {
                                let baseGallery: string[]
                                if (hasGalleryIdsInPayload) {
                                        baseGallery = [...(galleryAssetIds ?? [])]
                                } else {
                                        const existingGallery = await tx.assetLink.findMany({
                                                where: {
                                                        ownerType: OWNER_TYPE,
                                                        ownerId: existing.id,
                                                        role: AssetRole.GALLERY
                                                },
                                                orderBy: { position: 'asc' },
                                                select: { assetId: true }
                                        })
                                        baseGallery = existingGallery.map(link => link.assetId)
                                }

                                baseGallery.push(...newGalleryAssetIds)
                                let coverIdForFilter: string | undefined
                                if (uploads.cover) {
                                        coverIdForFilter = coverAssetIdFromUploads ?? undefined
                                } else if (typeof data.coverAssetId === 'string') {
                                        coverIdForFilter = data.coverAssetId
                                } else {
                                        const existingCover = await tx.assetLink.findFirst({
                                                where: {
                                                        ownerType: OWNER_TYPE,
                                                        ownerId: existing.id,
                                                        role: AssetRole.COVER
                                                },
                                                select: { assetId: true }
                                        })
                                        if (existingCover?.assetId) {
                                                coverIdForFilter = existingCover.assetId
                                        }
                                }

                                const combined = uniquePreserveOrder(baseGallery)
                                assetPayload.galleryAssetIds = coverIdForFilter
                                        ? combined.filter(id => id !== coverIdForFilter)
                                        : combined
                        }

                        const finalAssetIds = new Set<string>()

                        const existingCoverLink = existingAssetLinks.find(link => link.role === AssetRole.COVER)
                        const existingGalleryLinks = existingAssetLinks.filter(link => link.role === AssetRole.GALLERY)

                        if (shouldUpdateCover) {
                                if (assetPayload.coverAssetId) {
                                        finalAssetIds.add(assetPayload.coverAssetId)
                                }
                        } else if (existingCoverLink) {
                                finalAssetIds.add(existingCoverLink.assetId)
                        }

                        if (shouldUpdateGallery) {
                                for (const assetId of assetPayload.galleryAssetIds ?? []) {
                                        finalAssetIds.add(assetId)
                                }
                        } else {
                                for (const link of existingGalleryLinks) {
                                        finalAssetIds.add(link.assetId)
                                }
                        }

                        for (const link of existingAssetLinks) {
                                if (link.role !== AssetRole.COVER && link.role !== AssetRole.GALLERY) {
                                        finalAssetIds.add(link.assetId)
                                }
                        }

                        assetsPendingRemoval = existingAssetLinks
                                .filter(link => !finalAssetIds.has(link.assetId))
                                .map(link => ({
                                        assetId: link.assetId,
                                        provider: link.asset.provider ?? null,
                                        publicId: link.asset.publicId ?? null,
                                        mimeType: link.asset.mimeType ?? null
                                }))

                        await syncPortfolioAssets(tx, existing.id, assetPayload, actorId)

                        if (assetsPendingRemoval.length > 0) {
                                await tx.asset.deleteMany({
                                        where: {
                                                id: { in: assetsPendingRemoval.map(asset => asset.assetId) },
                                                links: { none: {} }
                                        }
                                })
                        }
                })

        } catch (error) {
                await cleanupUploadedMedia(uploads)
                throw error
        }

        if (assetsPendingRemoval.length > 0) {
                const remainingAssets = await prismaClient.asset.findMany({
                        where: { id: { in: assetsPendingRemoval.map(asset => asset.assetId) } },
                        select: { id: true }
                })

                if (remainingAssets.length > 0) {
                        const remainingIds = new Set(remainingAssets.map(asset => asset.id))
                        assetsPendingRemoval = assetsPendingRemoval.filter(asset => !remainingIds.has(asset.assetId))
                }

                if (assetsPendingRemoval.length > 0) {
                        await cleanupRemovedAssets(assetsPendingRemoval)
                }
        }

        return getPortfolioById(freelancerId, portfolioId, true)
}

const deletePortfolio = async (freelancerId: string, portfolioId: string, actorId: string): Promise<void> => {
        const existing = await prismaClient.portfolioProject.findFirst({
                where: { id: portfolioId, freelancerId }
        })

        if (!existing) {
                throw new NotFoundException('Portfolio không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        await prismaClient.$transaction([
                prismaClient.portfolioProject.update({
                        where: { id: portfolioId },
                        data: {
                                isDeleted: true,
                                deletedAt: new Date(),
                                deletedBy: actorId
                        }
                }),
                prismaClient.assetLink.deleteMany({
                        where: {
                                ownerType: OWNER_TYPE,
                                ownerId: portfolioId
                        }
                })
        ])
}

export default {
        listPortfolios,
        getPortfolioById,
        createPortfolio,
        updatePortfolio,
        deletePortfolio
}
