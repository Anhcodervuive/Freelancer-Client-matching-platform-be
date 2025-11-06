import {
        AssetProvider,
        JobExperienceLevel,
        JobLocationType,
        JobPaymentMode,
        JobPostFormVersion,
        JobStatus,
        JobVisibility,
        Prisma,
        Role
} from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { destroyCloudinary } from '~/providers/cloudinaryProvider.provider'
import { deleteR2Object } from '~/providers/r2.provider'
import jobPostModerationService from '~/services/moderation/job-post-moderation.service'
import type {
        AdminJobActivityQuery,
        AdminListJobPostQuery,
        AdminRemoveJobAttachmentInput,
        AdminUpdateJobPostStatusInput
} from '~/schema/admin-job-post.schema'

const ADMIN_STATUS_TARGETS = new Set<JobStatus>([
        JobStatus.PUBLISHED,
        JobStatus.PAUSED,
        JobStatus.REJECTED,
        JobStatus.PUBLISHED_PENDING_REVIEW
])
const ADMIN_ACTIVITY_STATUS_CHANGE = 'ADMIN_STATUS_CHANGE'
const ADMIN_ACTIVITY_ATTACHMENT_REMOVED = 'ADMIN_ATTACHMENT_REMOVED'

const jobPostDetailInclude = {
        specialty: {
                include: {
                        category: true
                }
        },
        languages: true,
        requiredSkills: {
                include: { skill: true }
        },
        screeningQuestions: true,
        attachments: {
                include: {
                        assetLink: {
                                include: {
                                        asset: true
                                }
                        }
                }
        },
        client: {
                select: {
                        userId: true,
                        companyName: true,
                        profile: {
                                select: {
                                        firstName: true,
                                        lastName: true,
                                        user: {
                                                select: {
                                                        id: true,
                                                        email: true,
                                                        role: true,
                                                        isActive: true
                                                }
                                        }
                                }
                        }
                }
        }
} satisfies Prisma.JobPostInclude

const jobPostSummaryInclude = {
        specialty: {
                include: {
                        category: true
                }
        },
        languages: true,
        requiredSkills: {
                include: { skill: true }
        },
        attachments: true,
        client: {
                select: {
                        userId: true,
                        companyName: true,
                        profile: {
                                select: {
                                        firstName: true,
                                        lastName: true,
                                        user: {
                                                select: {
                                                        id: true,
                                                        email: true,
                                                        role: true,
                                                        isActive: true
                                                }
                                        }
                                }
                        }
                }
        }
} satisfies Prisma.JobPostInclude

type JobPostDetailPayload = Prisma.JobPostGetPayload<{ include: typeof jobPostDetailInclude }>
type JobPostSummaryPayload = Prisma.JobPostGetPayload<{ include: typeof jobPostSummaryInclude }>
type JobSkillRelation = Pick<JobPostDetailPayload['requiredSkills'][number], 'isPreferred' | 'orderHint'> & {
        skill: Pick<JobPostDetailPayload['requiredSkills'][number]['skill'], 'id' | 'name' | 'slug'>
}

type ManualModerationEntry = {
        status: JobStatus
        reason: string | null
        note: string | null
        actorId: string
        actorRole: Role
        at: string
}

type AssetCleanupTarget = {
        provider: AssetProvider | null
        publicId: string | null
        bucket: string | null
        storageKey: string | null
        mimeType: string | null
}

type StatusTransitionMap = Partial<Record<JobStatus, readonly JobStatus[]>>

const STATUS_TRANSITIONS: StatusTransitionMap = {
        [JobStatus.DRAFT]: [JobStatus.PUBLISHED_PENDING_REVIEW],
        [JobStatus.PUBLISHED_PENDING_REVIEW]: [JobStatus.PUBLISHED, JobStatus.PAUSED, JobStatus.REJECTED],
        [JobStatus.PUBLISHED]: [JobStatus.PAUSED, JobStatus.REJECTED, JobStatus.PUBLISHED_PENDING_REVIEW],
        [JobStatus.PAUSED]: [JobStatus.PUBLISHED, JobStatus.PUBLISHED_PENDING_REVIEW, JobStatus.REJECTED],
        [JobStatus.REJECTED]: [JobStatus.PUBLISHED_PENDING_REVIEW, JobStatus.PUBLISHED],
        [JobStatus.CLOSED]: []
}

const uniquePreserveOrder = <T>(items: readonly T[]): T[] => {
        const seen = new Set<T>()
        const result: T[] = []
        for (const item of items) {
                if (seen.has(item)) continue
                seen.add(item)
                result.push(item)
        }
        return result
}

const mapSkills = (relations: readonly JobSkillRelation[]) => {
        const required: { id: string; name: string; slug: string; orderHint: number | null }[] = []
        const preferred: { id: string; name: string; slug: string; orderHint: number | null }[] = []

        const sorted = [...relations].sort((a, b) => {
                if (a.isPreferred !== b.isPreferred) {
                        return a.isPreferred ? 1 : -1
                }
                const hintA = a.orderHint ?? Number.MAX_SAFE_INTEGER
                const hintB = b.orderHint ?? Number.MAX_SAFE_INTEGER
                if (hintA !== hintB) return hintA - hintB
                return 0
        })

        for (const relation of sorted) {
                const view = {
                        id: relation.skill.id,
                        name: relation.skill.name,
                        slug: relation.skill.slug,
                        orderHint: relation.orderHint ?? null
                }

                if (relation.isPreferred) {
                        preferred.push(view)
                } else {
                        required.push(view)
                }
        }

        return { required, preferred }
}

const serializeClientSummary = (
        client: NonNullable<JobPostDetailPayload['client']>
): {
        id: string
        companyName: string | null
        email: string | null
        firstName: string | null
        lastName: string | null
        isActive: boolean | null
        role: Role | null
} => ({
        id: client.userId,
        companyName: client.companyName ?? null,
        email: client.profile?.user.email ?? null,
        firstName: client.profile?.firstName ?? null,
        lastName: client.profile?.lastName ?? null,
        isActive: client.profile?.user.isActive ?? null,
        role: client.profile?.user.role ?? null
})

const serializeJobPostSummary = (job: JobPostSummaryPayload) => {
        const skills = mapSkills(job.requiredSkills as readonly JobSkillRelation[])

        return {
                id: job.id,
                client: job.client ? serializeClientSummary(job.client) : null,
                formVersion: job.formVersion,
                specialty: {
                        id: job.specialty.id,
                        name: job.specialty.name,
                        category: {
                                id: job.specialty.category.id,
                                name: job.specialty.category.name
                        }
                },
                title: job.title,
                description: job.description,
                paymentMode: job.paymentMode,
                budgetAmount: job.budgetAmount ? Number(job.budgetAmount) : null,
                budgetCurrency: job.budgetCurrency ?? null,
                duration: job.duration ?? null,
                experienceLevel: job.experienceLevel,
                locationType: job.locationType,
                preferredLocations: job.preferredLocations ?? [],
                visibility: job.visibility,
                status: job.status,
                publishedAt: job.publishedAt ?? null,
                closedAt: job.closedAt ?? null,
                moderationScore: job.moderationScore ?? null,
                moderationCategory: job.moderationCategory ?? null,
                moderationSummary: job.moderationSummary ?? null,
                moderationCheckedAt: job.moderationCheckedAt ?? null,
                proposalsCount: job.proposalsCount,
                viewsCount: job.viewsCount,
                attachmentsCount: job.attachments.length,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
                languages: job.languages.map(language => ({
                        languageCode: language.languageCode,
                        proficiency: language.proficiency
                })),
                skills
        }
}

const serializeJobPostDetail = (job: JobPostDetailPayload) => {
        const skills = mapSkills(job.requiredSkills)
        const attachments = job.attachments
                .map(attachment => ({
                        id: attachment.id,
                        assetLinkId: attachment.assetLinkId,
                        addedBy: attachment.addedBy ?? null,
                        createdAt: attachment.createdAt,
                        updatedAt: attachment.updatedAt,
                        position: attachment.assetLink.position,
                        isPrimary: attachment.assetLink.isPrimary,
                        label: attachment.assetLink.label ?? null,
                        caption: attachment.assetLink.caption ?? null,
                        asset: {
                                id: attachment.assetLink.assetId,
                                kind: attachment.assetLink.asset.kind,
                                url: attachment.assetLink.asset.url ?? null,
                                publicId: attachment.assetLink.asset.publicId ?? null,
                                mimeType: attachment.assetLink.asset.mimeType ?? null,
                                bytes: attachment.assetLink.asset.bytes ?? null,
                                width: attachment.assetLink.asset.width ?? null,
                                height: attachment.assetLink.asset.height ?? null
                        }
                }))
                .sort((a, b) => a.position - b.position)

        return {
                id: job.id,
                client: job.client ? serializeClientSummary(job.client) : null,
                formVersion: job.formVersion,
                specialty: {
                        id: job.specialty.id,
                        name: job.specialty.name,
                        category: {
                                id: job.specialty.category.id,
                                name: job.specialty.category.name
                        }
                },
                title: job.title,
                description: job.description,
                paymentMode: job.paymentMode,
                budgetAmount: job.budgetAmount ? Number(job.budgetAmount) : null,
                budgetCurrency: job.budgetCurrency ?? null,
                duration: job.duration ?? null,
                experienceLevel: job.experienceLevel,
                locationType: job.locationType,
                preferredLocations: job.preferredLocations ?? [],
                customTerms: (job.customTerms ?? null) as Record<string, unknown> | null,
                visibility: job.visibility,
                status: job.status,
                publishedAt: job.publishedAt ?? null,
                closedAt: job.closedAt ?? null,
                moderationScore: job.moderationScore ?? null,
                moderationCategory: job.moderationCategory ?? null,
                moderationSummary: job.moderationSummary ?? null,
                moderationCheckedAt: job.moderationCheckedAt ?? null,
                moderationPayload: job.moderationPayload ?? null,
                proposalsCount: job.proposalsCount,
                viewsCount: job.viewsCount,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
                languages: job.languages.map(language => ({
                        languageCode: language.languageCode,
                        proficiency: language.proficiency
                })),
                skills,
                screeningQuestions: [...job.screeningQuestions]
                        .sort((a, b) => {
                                if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex
                                return a.createdAt.getTime() - b.createdAt.getTime()
                        })
                        .map(question => ({
                                id: question.id,
                                question: question.question,
                                isRequired: question.isRequired,
                                orderIndex: question.orderIndex
                        })),
                attachments
        }
}

const cleanupRemovedAssetObjects = async (targets: readonly AssetCleanupTarget[]) => {
        if (targets.length === 0) return

        const tasks = targets.map(target => {
                switch (target.provider) {
                        case AssetProvider.R2:
                                if (target.bucket && target.storageKey) {
                                        return deleteR2Object(target.bucket, target.storageKey)
                                }
                                return Promise.resolve()
                        case AssetProvider.CLOUDINARY:
                                if (target.publicId) {
                                        return destroyCloudinary(target.publicId, target.mimeType ?? undefined)
                                }
                                return Promise.resolve()
                        default:
                                return Promise.resolve()
                }
        })

        await Promise.allSettled(tasks)
}

const buildJobPostWhere = (params: {
        includeDeleted?: boolean
        search?: string
        statuses?: JobStatus[]
        paymentModes?: JobPaymentMode[]
        formVersions?: JobPostFormVersion[]
        experienceLevels?: JobExperienceLevel[]
        locationTypes?: JobLocationType[]
        visibility?: JobVisibility
        specialtyId?: string
        categoryId?: string
        languageCodes?: string[]
        skillIds?: string[]
        clientId?: string
        hasAttachments?: boolean
        budgetMin?: number
        budgetMax?: number
        createdFrom?: Date
        createdTo?: Date
}) => {
        const where: Prisma.JobPostWhereInput = params.includeDeleted ? {} : { isDeleted: false }
        const andConditions: Prisma.JobPostWhereInput[] = []

        if (params.search) {
                where.OR = [{ title: { contains: params.search } }, { description: { contains: params.search } }]
        }

        if (params.clientId) {
                where.clientId = params.clientId
        }

        if (params.specialtyId) {
                where.specialtyId = params.specialtyId
        }

        if (params.categoryId) {
                where.specialty = { categoryId: params.categoryId }
        }

        if (params.statuses && params.statuses.length > 0) {
                where.status = params.statuses.length === 1 ? params.statuses[0]! : { in: params.statuses }
        }

        if (params.paymentModes && params.paymentModes.length > 0) {
                where.paymentMode = params.paymentModes.length === 1 ? params.paymentModes[0]! : { in: params.paymentModes }
        }

        if (params.formVersions && params.formVersions.length > 0) {
                where.formVersion = params.formVersions.length === 1 ? params.formVersions[0]! : { in: params.formVersions }
        }

        if (params.experienceLevels && params.experienceLevels.length > 0) {
                where.experienceLevel =
                        params.experienceLevels.length === 1
                                ? params.experienceLevels[0]!
                                : { in: params.experienceLevels }
        }

        if (params.locationTypes && params.locationTypes.length > 0) {
                where.locationType =
                        params.locationTypes.length === 1 ? params.locationTypes[0]! : { in: params.locationTypes }
        }

        if (params.visibility) {
                where.visibility = params.visibility
        }

        if (params.languageCodes && params.languageCodes.length > 0) {
                for (const code of params.languageCodes) {
                        andConditions.push({ languages: { some: { languageCode: code } } })
                }
        }

        if (params.skillIds && params.skillIds.length > 0) {
                for (const skillId of params.skillIds) {
                        andConditions.push({ requiredSkills: { some: { skillId } } })
                }
        }

        if (params.hasAttachments === true) {
                andConditions.push({ attachments: { some: {} } })
        } else if (params.hasAttachments === false) {
                andConditions.push({ attachments: { none: {} } })
        }

        if (params.budgetMin !== undefined || params.budgetMax !== undefined) {
                where.budgetAmount = {
                        ...(params.budgetMin !== undefined ? { gte: params.budgetMin } : {}),
                        ...(params.budgetMax !== undefined ? { lte: params.budgetMax } : {})
                }
                andConditions.push({ budgetAmount: { not: null } })
        }

        if (params.createdFrom || params.createdTo) {
                where.createdAt = {
                        ...(params.createdFrom ? { gte: params.createdFrom } : {}),
                        ...(params.createdTo ? { lte: params.createdTo } : {})
                }
        }

        if (andConditions.length > 0) {
                if (Array.isArray(where.AND)) {
                        where.AND = [...where.AND, ...andConditions]
                } else if (where.AND) {
                        where.AND = [where.AND, ...andConditions]
                } else {
                        where.AND = andConditions
                }
        }

        return where
}

const appendManualModerationPayload = (
        current: Prisma.JsonValue | null,
        entry: ManualModerationEntry
): Prisma.JsonValue => {
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
                return { manualActions: [entry] }
        }

        const base = { ...(current as Record<string, unknown>) }
        const baseRecord = base as Record<string, unknown>
        const manualActions = Array.isArray(baseRecord.manualActions)
                ? ([...baseRecord.manualActions] as ManualModerationEntry[])
                : []

        return {
                ...base,
                manualActions: [...manualActions, entry]
        }
}

const ensureJobExists = async (jobId: string) => {
        const job = await prismaClient.jobPost.findUnique({
                where: { id: jobId },
                select: { id: true }
        })

        if (!job) {
                throw new NotFoundException('Job post không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }
}

const listJobPosts = async (filters: AdminListJobPostQuery) => {
        const page = filters.page
        const limit = filters.limit
        const sortBy = filters.sortBy ?? 'newest'

        if (
                filters.budgetMin !== undefined &&
                filters.budgetMax !== undefined &&
                filters.budgetMin > filters.budgetMax
        ) {
                throw new BadRequestException('budgetMin phải nhỏ hơn hoặc bằng budgetMax', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (filters.createdFrom && filters.createdTo && filters.createdFrom > filters.createdTo) {
                throw new BadRequestException('createdFrom phải nhỏ hơn hoặc bằng createdTo', ErrorCode.PARAM_QUERY_ERROR)
        }

        const statuses = filters.statuses ? (uniquePreserveOrder(filters.statuses) as JobStatus[]) : undefined
        const languageCodes = filters.languageCodes
                ? uniquePreserveOrder(filters.languageCodes.map(code => code.toUpperCase()))
                : undefined
        const skillIds = filters.skillIds ? uniquePreserveOrder(filters.skillIds) : undefined
        const paymentModes = filters.paymentModes
                ? (uniquePreserveOrder(filters.paymentModes) as JobPaymentMode[])
                : undefined
        const formVersions = filters.formVersions
                ? (uniquePreserveOrder(filters.formVersions) as JobPostFormVersion[])
                : undefined
        const experienceLevels = filters.experienceLevels
                ? (uniquePreserveOrder(filters.experienceLevels) as JobExperienceLevel[])
                : undefined
        const locationTypes = filters.locationTypes
                ? (uniquePreserveOrder(filters.locationTypes) as JobLocationType[])
                : undefined

        const includeDeleted = filters.includeDeleted === true

        const where = buildJobPostWhere({
                ...(includeDeleted ? { includeDeleted: true } : {}),
                ...(filters.search ? { search: filters.search } : {}),
                ...(statuses ? { statuses } : {}),
                ...(paymentModes ? { paymentModes } : {}),
                ...(formVersions ? { formVersions } : {}),
                ...(experienceLevels ? { experienceLevels } : {}),
                ...(locationTypes ? { locationTypes } : {}),
                ...(filters.visibility ? { visibility: filters.visibility } : {}),
                ...(filters.specialtyId ? { specialtyId: filters.specialtyId } : {}),
                ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
                ...(languageCodes ? { languageCodes } : {}),
                ...(skillIds ? { skillIds } : {}),
                ...(filters.clientId ? { clientId: filters.clientId } : {}),
                ...(filters.hasAttachments !== undefined ? { hasAttachments: filters.hasAttachments } : {}),
                ...(filters.budgetMin !== undefined ? { budgetMin: filters.budgetMin } : {}),
                ...(filters.budgetMax !== undefined ? { budgetMax: filters.budgetMax } : {}),
                ...(filters.createdFrom ? { createdFrom: filters.createdFrom } : {}),
                ...(filters.createdTo ? { createdTo: filters.createdTo } : {})
        })

        const orderBy: Prisma.JobPostOrderByWithRelationInput =
                sortBy === 'oldest' ? { createdAt: Prisma.SortOrder.asc } : { createdAt: Prisma.SortOrder.desc }

        const [items, total] = await prismaClient.$transaction([
                prismaClient.jobPost.findMany({
                        where,
                        include: jobPostSummaryInclude,
                        orderBy,
                        skip: (page - 1) * limit,
                        take: limit
                }),
                prismaClient.jobPost.count({ where })
        ])

        return {
                data: items.map(serializeJobPostSummary),
                meta: {
                        page,
                        limit,
                        total
                }
        }
}

const getJobPostDetail = async (jobId: string) => {
        const job = await prismaClient.jobPost.findUnique({
                where: { id: jobId },
                include: jobPostDetailInclude
        })

        if (!job) {
                throw new NotFoundException('Job post không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return serializeJobPostDetail(job)
}

const updateJobPostStatus = async (
        jobId: string,
        adminId: string,
        input: AdminUpdateJobPostStatusInput
) => {
        const job = await prismaClient.jobPost.findUnique({
                where: { id: jobId },
                select: {
                        id: true,
                        status: true,
                        isDeleted: true,
                        publishedAt: true,
                        closedAt: true,
                        moderationScore: true,
                        moderationCategory: true,
                        moderationSummary: true,
                        moderationCheckedAt: true,
                        moderationPayload: true
                }
        })

        if (!job) {
                throw new NotFoundException('Job post không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        const targetStatus = input.status

        if (!ADMIN_STATUS_TARGETS.has(targetStatus)) {
                throw new BadRequestException('Trạng thái không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (job.status === JobStatus.CLOSED) {
                throw new BadRequestException('Không thể thay đổi trạng thái job đã đóng', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (job.status === targetStatus) {
                return getJobPostDetail(jobId)
        }

        const allowedTargets = STATUS_TRANSITIONS[job.status]
        if (!allowedTargets || !allowedTargets.includes(targetStatus)) {
                throw new BadRequestException('Trạng thái không hợp lệ cho job hiện tại', ErrorCode.PARAM_QUERY_ERROR)
        }

        const now = new Date()
        const manualEntry: ManualModerationEntry = {
                status: targetStatus,
                reason: input.reason ?? null,
                note: input.note ?? null,
                actorId: adminId,
                actorRole: Role.ADMIN,
                at: now.toISOString()
        }

        const nextPayload = appendManualModerationPayload(job.moderationPayload ?? null, manualEntry)

        const updateData: Prisma.JobPostUncheckedUpdateInput = {
                status: targetStatus,
                moderationPayload: nextPayload as Prisma.InputJsonValue,
                moderationCheckedAt: now
        }

        if (input.reason !== undefined) {
                updateData.moderationSummary = input.reason
        }

        if (targetStatus === JobStatus.PUBLISHED || targetStatus === JobStatus.PUBLISHED_PENDING_REVIEW) {
                updateData.publishedAt = job.publishedAt ?? now
                updateData.closedAt = null
                updateData.isDeleted = false
                updateData.deletedAt = null
                updateData.deletedBy = null
        } else if (targetStatus === JobStatus.PAUSED || targetStatus === JobStatus.REJECTED) {
                updateData.closedAt = null
                if (targetStatus !== JobStatus.REJECTED) {
                        updateData.isDeleted = false
                        updateData.deletedAt = null
                        updateData.deletedBy = null
                }
        }

        if (targetStatus === JobStatus.PUBLISHED_PENDING_REVIEW) {
                updateData.moderationScore = null
                updateData.moderationCategory = null
                updateData.moderationSummary = input.reason ?? null
                updateData.moderationCheckedAt = now
        }

        await prismaClient.$transaction(async tx => {
                await tx.jobPost.update({
                        where: { id: jobId },
                        data: updateData
                })

                await tx.jobActivityLog.create({
                        data: {
                                jobId,
                                actorId: adminId,
                                actorRole: Role.ADMIN,
                                action: ADMIN_ACTIVITY_STATUS_CHANGE,
                                metadata: {
                                        fromStatus: job.status,
                                        toStatus: targetStatus,
                                        reason: input.reason ?? null,
                                        note: input.note ?? null
                                }
                        }
                })
        })

        if (targetStatus === JobStatus.PUBLISHED_PENDING_REVIEW) {
                await jobPostModerationService.requestModeration({ jobPostId: jobId, trigger: 'MANUAL' })
        }

        return getJobPostDetail(jobId)
}

const removeJobPostAttachment = async (
        jobId: string,
        attachmentId: string,
        adminId: string,
        input: AdminRemoveJobAttachmentInput
) => {
        const job = await prismaClient.jobPost.findUnique({
                where: { id: jobId },
                select: { id: true, isDeleted: true }
        })

        if (!job) {
                throw new NotFoundException('Job post không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        if (job.isDeleted) {
                throw new BadRequestException('Job post đã bị xóa, không thể cập nhật tệp đính kèm', ErrorCode.ITEM_NOT_FOUND)
        }

        const attachment = await prismaClient.jobPostAttachment.findUnique({
                where: { id: attachmentId },
                include: {
                        assetLink: {
                                include: {
                                        asset: true
                                }
                        }
                }
        })

        if (!attachment || attachment.jobId !== jobId) {
                throw new NotFoundException('Tệp đính kèm không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        const assetsToCleanup: AssetCleanupTarget[] = []

        await prismaClient.$transaction(async tx => {
                await tx.jobPostAttachment.delete({ where: { id: attachmentId } })
                await tx.assetLink.delete({ where: { id: attachment.assetLinkId } })

                const remainingLinks = await tx.assetLink.count({
                        where: { assetId: attachment.assetLink.assetId }
                })

                if (remainingLinks === 0) {
                        const deletedAsset = await tx.asset.delete({
                                where: { id: attachment.assetLink.assetId },
                                select: {
                                        provider: true,
                                        publicId: true,
                                        bucket: true,
                                        storageKey: true,
                                        mimeType: true
                                }
                        })
                        assetsToCleanup.push(deletedAsset)
                }

                const remainingAttachments = await tx.jobPostAttachment.findMany({
                        where: { jobId },
                        include: { assetLink: true },
                        orderBy: { assetLink: { position: Prisma.SortOrder.asc } }
                })

                await Promise.all(
                        remainingAttachments.map((item, index) =>
                                tx.assetLink.update({
                                        where: { id: item.assetLinkId },
                                        data: {
                                                position: index,
                                                isPrimary: index === 0
                                        }
                                })
                        )
                )

                await tx.jobActivityLog.create({
                        data: {
                                jobId,
                                actorId: adminId,
                                actorRole: Role.ADMIN,
                                action: ADMIN_ACTIVITY_ATTACHMENT_REMOVED,
                                metadata: {
                                        attachmentId,
                                        assetId: attachment.assetLink.assetId,
                                        reason: input.reason ?? null,
                                        note: input.note ?? null
                                }
                        }
                })
        })

        await cleanupRemovedAssetObjects(assetsToCleanup)

        return getJobPostDetail(jobId)
}

const listJobActivityLogs = async (jobId: string, query: AdminJobActivityQuery) => {
        await ensureJobExists(jobId)

        const page = query.page
        const limit = query.limit

        const [items, total] = await prismaClient.$transaction([
                prismaClient.jobActivityLog.findMany({
                        where: { jobId },
                        orderBy: { createdAt: Prisma.SortOrder.desc },
                        include: {
                                actor: {
                                        select: {
                                                id: true,
                                                email: true,
                                                role: true,
                                                profile: {
                                                        select: {
                                                                firstName: true,
                                                                lastName: true
                                                        }
                                                }
                                        }
                                }
                        },
                        skip: (page - 1) * limit,
                        take: limit
                }),
                prismaClient.jobActivityLog.count({ where: { jobId } })
        ])

        const data = items.map(item => ({
                id: item.id,
                action: item.action,
                metadata: item.metadata ?? null,
                createdAt: item.createdAt,
                actorRole: item.actorRole,
                actor: item.actor
                        ? {
                                id: item.actor.id,
                                email: item.actor.email,
                                role: item.actorRole ?? item.actor.role ?? null,
                                firstName: item.actor.profile?.firstName ?? null,
                                lastName: item.actor.profile?.lastName ?? null
                        }
                        : {
                                id: null,
                                email: null,
                                role: item.actorRole ?? null,
                                firstName: null,
                                lastName: null
                        }
        }))

        return {
                data,
                meta: {
                        page,
                        limit,
                        total
                }
        }
}

export default {
        listJobPosts,
        getJobPostDetail,
        updateJobPostStatus,
        removeJobPostAttachment,
        listJobActivityLogs
}
