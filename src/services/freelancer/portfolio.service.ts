import { prismaClient } from '~/config/prisma-client'
import {
        AssetKind,
        AssetOwnerType,
        AssetRole,
        PortfolioVisibility,
        Prisma
} from '~/generated/prisma'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { CreatePortfolioInput, UpdatePortfolioInput } from '~/schema/portfolio.schema'

const OWNER_TYPE = AssetOwnerType.PORTFOLIO

type TransactionClient = Parameters<
        Extract<Parameters<typeof prismaClient.$transaction>[0], (client: any) => unknown>
>[0]

const portfolioInclude = {
        skills: {
                include: {
                        skill: true
                }
        }
} satisfies Prisma.PortfolioProjectInclude

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

type PortfolioWithSkills = Prisma.PortfolioProjectGetPayload<{
        include: typeof portfolioInclude
}>

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
                        skills: portfolio.skills.map(({ skill }) => ({
                                id: skill.id,
                                name: skill.name,
                                slug: skill.slug
                        })),
                        coverAsset: assets.cover,
                        galleryAssets: assets.gallery
                }
        })
}

const listPortfolios = async (freelancerId: string, includePrivate: boolean): Promise<PortfolioView[]> => {
        await ensureFreelancerExists(freelancerId)

        const portfolios = await prismaClient.portfolioProject.findMany({
                where: {
                        freelancerId,
                        ...(includePrivate ? {} : { visibility: PortfolioVisibility.PUBLIC })
                },
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
        actorId: string
): Promise<PortfolioView> => {
        await ensureFreelancerExists(freelancerId)

        const skillIds = await validateSkillIds(data.skillIds)
        const galleryAssetIds = data.galleryAssetIds ? uniquePreserveOrder(data.galleryAssetIds) : []
        const assetIds = new Set<string>()

        if (data.coverAssetId) assetIds.add(data.coverAssetId)
        for (const assetId of galleryAssetIds) assetIds.add(assetId)
        await validateAssetIds(assetIds)

        const visibility = data.visibility ?? PortfolioVisibility.PUBLIC
        const explicitPublishedAt = data.publishedAt ?? null
        const publishedAt =
                explicitPublishedAt !== null || data.publishedAt === null
                        ? explicitPublishedAt
                        : visibility === PortfolioVisibility.PUBLIC
                        ? new Date()
                        : null

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

                const assetPayload: { coverAssetId?: string | null; galleryAssetIds?: readonly string[] } = {}
                if (data.coverAssetId) {
                        assetPayload.coverAssetId = data.coverAssetId
                }
                assetPayload.galleryAssetIds = galleryAssetIds

                await syncPortfolioAssets(tx, createdPortfolio.id, assetPayload, actorId)

                return createdPortfolio
        })

        return getPortfolioById(freelancerId, created.id, true)
}

const updatePortfolio = async (
        freelancerId: string,
        portfolioId: string,
        data: UpdatePortfolioInput,
        actorId: string
): Promise<PortfolioView> => {
        const existing = await prismaClient.portfolioProject.findFirst({
                where: { id: portfolioId, freelancerId },
                include: portfolioInclude
        })

        if (!existing) {
                throw new NotFoundException('Portfolio không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        const skillIds = data.skillIds !== undefined ? await validateSkillIds(data.skillIds) : undefined
        const galleryAssetIds =
                data.galleryAssetIds !== undefined ? uniquePreserveOrder(data.galleryAssetIds) : undefined

        const assetIds = new Set<string>()
        if (data.coverAssetId) assetIds.add(data.coverAssetId)
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

        await prismaClient.$transaction(async (tx: TransactionClient) => {
                await tx.portfolioProject.update({
                        where: { id: existing.id },
                        data: updateData
                })

                if (skillIds !== undefined) {
                        await setPortfolioSkills(tx, existing.id, skillIds)
                }

                const assetPayload: { coverAssetId?: string | null; galleryAssetIds?: readonly string[] } = {}
                if (data.coverAssetId !== undefined) {
                        assetPayload.coverAssetId = data.coverAssetId
                }
                if (galleryAssetIds !== undefined) {
                        assetPayload.galleryAssetIds = galleryAssetIds
                }

                await syncPortfolioAssets(tx, existing.id, assetPayload, actorId)
        })

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
