import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { Express } from 'express'

import {
        AssetKind,
        AssetOwnerType,
        AssetProvider,
        AssetRole,
        AssetStatus,
        JobExperienceLevel,
        JobLocationType,
        JobPaymentMode,
        JobPostFormVersion,
        JobStatus,
        JobVisibility,
        LanguageProficiency,
        Prisma
} from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { R2_CONFIG } from '~/config/environment'
import {
        CreateJobPostInput,
        JobPostFilterInput,
        UpdateJobPostInput
} from '~/schema/job-post.schema'
import { destroyCloudinary } from '~/providers/cloudinaryProvider.provider'
import { deleteR2Object, uploadBufferToR2 } from '~/providers/r2.provider'

type TransactionClient = Parameters<
        Extract<Parameters<typeof prismaClient.$transaction>[0], (client: any) => unknown>
>[0]

const OWNER_TYPE = AssetOwnerType.JOB

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
        attachments: true
} satisfies Prisma.JobPostInclude

type JobPostWithRelations = Prisma.JobPostGetPayload<{ include: typeof jobPostDetailInclude }>
type JobPostSummaryPayload = Prisma.JobPostGetPayload<{ include: typeof jobPostSummaryInclude }>
type JobSkillRelation = Pick<JobPostWithRelations['requiredSkills'][number], 'isPreferred' | 'orderHint'> & {
        skill: Pick<JobPostWithRelations['requiredSkills'][number]['skill'], 'id' | 'name' | 'slug'>
}

type NormalizedLanguage = {
        languageCode: string
        proficiency: LanguageProficiency
}

type NormalizedSkills = {
        required: string[]
        preferred: string[]
}

type ScreeningQuestionInput = {
        question: string
        isRequired: boolean
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

const ensureClientProfile = async (userId: string) => {
        const client = await prismaClient.client.findUnique({
                where: { userId }
        })

        if (!client) {
                throw new BadRequestException('Chỉ client mới có thể quản lý job post', ErrorCode.USER_NOT_AUTHORITY)
        }

        return client
}

const ensureSpecialtyExists = async (specialtyId: string) => {
        const specialty = await prismaClient.specialty.findUnique({
                where: { id: specialtyId }
        })

        if (!specialty) {
                throw new NotFoundException('Specialty không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return specialty
}

const validateSkillIds = async (skills: NormalizedSkills) => {
        const allSkillIds = uniquePreserveOrder([...skills.required, ...skills.preferred])
        if (allSkillIds.length === 0) return

        const existing = await prismaClient.skill.findMany({
                where: { id: { in: allSkillIds } },
                select: { id: true }
        })

        if (existing.length !== allSkillIds.length) {
                throw new NotFoundException('Một hoặc nhiều kỹ năng không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }
}

const validateAssetIds = async (assetIds: readonly string[]) => {
        if (assetIds.length === 0) return

        const existing = await prismaClient.asset.findMany({
                where: { id: { in: Array.from(assetIds) } },
                select: { id: true }
        })

        if (existing.length !== assetIds.length) {
                throw new NotFoundException('Tệp đính kèm không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }
}

const normalizeSkills = (skills: NormalizedSkills): NormalizedSkills => {
        const required = uniquePreserveOrder(skills.required)
        const requiredSet = new Set(required)
        const preferred = uniquePreserveOrder(skills.preferred).filter(id => !requiredSet.has(id))

        return { required, preferred }
}

const normalizeLanguages = (languages: readonly NormalizedLanguage[]): NormalizedLanguage[] => {
        const normalized: NormalizedLanguage[] = []
        const seen = new Set<string>()

        for (const entry of languages) {
                if (seen.has(entry.languageCode)) {
                        const index = normalized.findIndex(item => item.languageCode === entry.languageCode)
                        if (index >= 0) normalized[index] = entry
                        continue
                }
                seen.add(entry.languageCode)
                normalized.push(entry)
        }

        return normalized
}

type UploadedAttachment = {
        file: Express.Multer.File
        object: Awaited<ReturnType<typeof uploadBufferToR2>>
}

type AssetCleanupTarget = {
        provider: AssetProvider | null
        publicId: string | null
        bucket: string | null
        storageKey: string | null
        mimeType: string | null
}

const determineAssetKind = (mime: string): AssetKind =>
        mime.startsWith('image/') ? AssetKind.IMAGE : mime.startsWith('video/') ? AssetKind.VIDEO : AssetKind.FILE

const jobAttachmentFolderForUser = (userId: string) => {
        const base = R2_CONFIG.JOB_ATTACHMENT_PREFIX || 'job-posts'
        return [base, userId].filter(Boolean).join('/')
}

const slugifyFileName = (name: string) => {
        const normalized = name
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .toLowerCase()
        return normalized.length > 0 ? normalized : 'file'
}

const buildAttachmentKey = (userId: string, originalName: string) => {
        const folder = jobAttachmentFolderForUser(userId)
        const ext = path.extname(originalName)
        const base = path.basename(originalName, ext)
        const safeBase = slugifyFileName(base)
        const extension = ext ? ext.toLowerCase() : ''
        return [folder, `${safeBase}-${randomUUID()}${extension}`].filter(Boolean).join('/')
}

const cleanupUploadedAttachments = async (uploads: readonly UploadedAttachment[]) => {
        if (uploads.length === 0) return

        const tasks = uploads.map(item =>
                deleteR2Object(item.object.bucket, item.object.key).catch(() => undefined)
        )

        await Promise.allSettled(tasks)
}

const uploadAttachmentFiles = async (
        userId: string,
        files: readonly Express.Multer.File[] | undefined
): Promise<UploadedAttachment[]> => {
        if (!files || files.length === 0) return []

        const uploads: UploadedAttachment[] = []

        try {
                for (const file of files) {
                        const key = buildAttachmentKey(userId, file.originalname)
                        const object = await uploadBufferToR2(file.buffer, {
                                key,
                                contentType: file.mimetype
                        })
                        uploads.push({ file, object })
                }

                return uploads
        } catch (error) {
                await cleanupUploadedAttachments(uploads)
                throw error
        }
}

const persistAttachmentUploads = async (
        tx: TransactionClient,
        uploads: readonly UploadedAttachment[],
        actorId: string
): Promise<string[]> => {
        if (uploads.length === 0) return []

        const assetIds: string[] = []

        for (const item of uploads) {
                const meta: Prisma.JsonObject = { originalName: item.file.originalname }

                const asset = await tx.asset.create({
                        data: {
                                provider: AssetProvider.R2,
                                kind: determineAssetKind(item.file.mimetype),
                                bucket: item.object.bucket,
                                storageKey: item.object.key,
                                url: item.object.url,
                                mimeType: item.file.mimetype,
                                bytes: item.file.size ?? null,
                                createdBy: actorId,
                                status: AssetStatus.READY,
                                meta
                        }
                })

                assetIds.push(asset.id)
        }

        return assetIds
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

const fetchCurrentAttachmentAssetIds = async (tx: TransactionClient, jobId: string): Promise<string[]> => {
        const links = await tx.assetLink.findMany({
                where: {
                        ownerType: OWNER_TYPE,
                        ownerId: jobId,
                        role: AssetRole.ATTACHMENT
                },
                orderBy: { position: Prisma.SortOrder.asc }
        })

        return links.map(link => link.assetId)
}

const syncJobLanguages = async (tx: TransactionClient, jobId: string, languages: readonly NormalizedLanguage[]) => {
        await tx.jobLanguageRequirement.deleteMany({ where: { jobId } })

        if (languages.length === 0) return

        await tx.jobLanguageRequirement.createMany({
                data: languages.map(language => ({
                        jobId,
                        languageCode: language.languageCode,
                        proficiency: language.proficiency
                }))
        })
}

const syncJobSkills = async (tx: TransactionClient, jobId: string, skills: NormalizedSkills) => {
        await tx.jobRequiredSkill.deleteMany({ where: { jobId } })

        const rows: Prisma.JobRequiredSkillCreateManyInput[] = []

        skills.required.forEach((skillId, index) => {
                rows.push({
                        jobId,
                        skillId,
                        isPreferred: false,
                        orderHint: index
                })
        })

        skills.preferred.forEach((skillId, index) => {
                rows.push({
                        jobId,
                        skillId,
                        isPreferred: true,
                        orderHint: index
                })
        })

        if (rows.length === 0) return

        await tx.jobRequiredSkill.createMany({ data: rows })
}

const syncScreeningQuestions = async (
        tx: TransactionClient,
        jobId: string,
        questions: readonly ScreeningQuestionInput[]
) => {
        await tx.jobScreeningQuestion.deleteMany({ where: { jobId } })

        if (questions.length === 0) return

        await tx.jobScreeningQuestion.createMany({
                data: questions.map((question, index) => ({
                        jobId,
                        question: question.question,
                        isRequired: question.isRequired,
                        orderIndex: index
                }))
        })
}

const syncJobAttachments = async (
        tx: TransactionClient,
        jobId: string,
        assetIds: readonly string[],
        actorId: string,
        removalQueue: AssetCleanupTarget[]
) => {
        const uniqueAssetIds = uniquePreserveOrder(assetIds)

        const existingLinks = await tx.assetLink.findMany({
                where: {
                        ownerType: OWNER_TYPE,
                        ownerId: jobId,
                        role: AssetRole.ATTACHMENT
                }
        })

        if (uniqueAssetIds.length === 0) {
                await tx.jobPostAttachment.deleteMany({ where: { jobId } })
                await tx.assetLink.deleteMany({
                        where: {
                                ownerType: OWNER_TYPE,
                                ownerId: jobId,
                                role: AssetRole.ATTACHMENT
                        }
                })

                const processedAssetIds = new Set<string>()
                for (const link of existingLinks) {
                        if (processedAssetIds.has(link.assetId)) continue
                        processedAssetIds.add(link.assetId)
                        const remaining = await tx.assetLink.count({ where: { assetId: link.assetId } })
                        if (remaining === 0) {
                                const asset = await tx.asset.delete({
                                        where: { id: link.assetId },
                                        select: {
                                                provider: true,
                                                publicId: true,
                                                bucket: true,
                                                storageKey: true,
                                                mimeType: true
                                        }
                                })
                                removalQueue.push(asset)
                        }
                }

                return
        }

        await tx.jobPostAttachment.deleteMany({
                where: {
                        jobId,
                        assetLink: { assetId: { notIn: uniqueAssetIds } }
                }
        })

        await tx.assetLink.deleteMany({
                where: {
                        ownerType: OWNER_TYPE,
                        ownerId: jobId,
                        role: AssetRole.ATTACHMENT,
                        assetId: { notIn: uniqueAssetIds }
                }
        })

        const existingByAssetId = new Map(existingLinks.map(link => [link.assetId, link]))

        for (const [index, assetId] of uniqueAssetIds.entries()) {
                const existing = existingByAssetId.get(assetId)

                if (existing) {
                        await tx.assetLink.update({
                                where: { id: existing.id },
                                data: {
                                        position: index,
                                        isPrimary: index === 0
                                }
                        })
                        continue
                }

                const assetLink = await tx.assetLink.create({
                        data: {
                                ownerType: OWNER_TYPE,
                                ownerId: jobId,
                                role: AssetRole.ATTACHMENT,
                                position: index,
                                isPrimary: index === 0,
                                assetId,
                                createdBy: actorId
                        }
                })

                await tx.jobPostAttachment.create({
                        data: {
                                jobId,
                                assetLinkId: assetLink.id,
                                addedBy: actorId
                        }
                })
        }

        const removedAssetIds = existingLinks
                .map(link => link.assetId)
                .filter(assetId => !uniqueAssetIds.includes(assetId))

        const processedRemovals = new Set<string>()
        for (const assetId of removedAssetIds) {
                if (processedRemovals.has(assetId)) continue
                processedRemovals.add(assetId)
                const remaining = await tx.assetLink.count({ where: { assetId } })
                if (remaining === 0) {
                        const asset = await tx.asset.delete({
                                where: { id: assetId },
                                select: {
                                        provider: true,
                                        publicId: true,
                                        bucket: true,
                                        storageKey: true,
                                        mimeType: true
                                }
                        })
                        removalQueue.push(asset)
                }
        }
}

const buildJobPostWhere = (params: {
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
        const where: Prisma.JobPostWhereInput = {}
        const andConditions: Prisma.JobPostWhereInput[] = []

        if (params.search) {
                where.OR = [
                        { title: { contains: params.search } },
                        { description: { contains: params.search } }
                ]
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
                where.paymentMode =
                        params.paymentModes.length === 1 ? params.paymentModes[0]! : { in: params.paymentModes }
        }

        if (params.formVersions && params.formVersions.length > 0) {
                where.formVersion =
                        params.formVersions.length === 1
                                ? params.formVersions[0]!
                                : { in: params.formVersions }
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

const serializeJobPost = (job: JobPostWithRelations) => {
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
                clientId: job.clientId,
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

const serializeJobPostSummary = (job: JobPostSummaryPayload) => {
        const skills = mapSkills(job.requiredSkills as readonly JobSkillRelation[])

        return {
                id: job.id,
                clientId: job.clientId,
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
                visibility: job.visibility,
                status: job.status,
                publishedAt: job.publishedAt ?? null,
                closedAt: job.closedAt ?? null,
                proposalsCount: job.proposalsCount,
                viewsCount: job.viewsCount,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
                languages: job.languages.map(language => ({
                        languageCode: language.languageCode,
                        proficiency: language.proficiency
                })),
                skills,
                attachmentsCount: job.attachments.length
        }
}

const createJobPost = async (
        clientUserId: string,
        input: CreateJobPostInput,
        options?: { attachmentFiles?: readonly Express.Multer.File[] }
) => {
        await ensureClientProfile(clientUserId)
        await ensureSpecialtyExists(input.specialtyId)

        const normalizedSkills = normalizeSkills(input.skills)
        await validateSkillIds(normalizedSkills)

        const attachmentAssetIds = input.attachments ? uniquePreserveOrder(input.attachments) : []
        await validateAssetIds(attachmentAssetIds)
        const uploadedAttachments = await uploadAttachmentFiles(clientUserId, options?.attachmentFiles)

        const languages = normalizeLanguages(input.languages)

        const status = input.status ?? JobStatus.DRAFT
        const now = new Date()

        const assetsToCleanup: AssetCleanupTarget[] = []

        try {
                const job = await prismaClient.$transaction(async tx => {
                        const createData: Prisma.JobPostUncheckedCreateInput = {
                                clientId: clientUserId,
                                specialtyId: input.specialtyId,
                                title: input.title,
                                description: input.description,
                                paymentMode: input.paymentMode,
                                formVersion: input.formVersion ?? JobPostFormVersion.VERSION_1,
                                experienceLevel: input.experienceLevel,
                                visibility: input.visibility ?? JobVisibility.PUBLIC,
                                status,
                                ...(input.duration ? { duration: input.duration } : {}),
                                ...(input.locationType ? { locationType: input.locationType } : {}),
                                ...(input.budgetAmount !== undefined
                                        ? { budgetAmount: input.budgetAmount === null ? null : input.budgetAmount }
                                        : {}),
                                ...(input.budgetCurrency !== undefined ? { budgetCurrency: input.budgetCurrency } : {}),
                                ...(input.preferredLocations !== undefined
                                        ? { preferredLocations: input.preferredLocations as Prisma.InputJsonValue }
                                        : {}),
                                ...(input.customTerms !== undefined
                                        ? { customTerms: input.customTerms as Prisma.InputJsonValue }
                                        : {}),
                                ...(status === JobStatus.PUBLISHED ? { publishedAt: now } : {}),
                                ...(status === JobStatus.CLOSED ? { closedAt: now } : {})
                        }

                        const created = await tx.jobPost.create({
                                data: createData
                        })

                        await syncJobLanguages(tx, created.id, languages)
                        await syncJobSkills(tx, created.id, normalizedSkills)
                        await syncScreeningQuestions(
                                tx,
                                created.id,
                                input.screeningQuestions.map(question => ({
                                        question: question.question.trim(),
                                        isRequired: question.isRequired
                                }))
                        )

                        let attachmentsToPersist = [...attachmentAssetIds]

                        if (uploadedAttachments.length > 0) {
                                const newAssetIds = await persistAttachmentUploads(tx, uploadedAttachments, clientUserId)
                                attachmentsToPersist = [...attachmentsToPersist, ...newAssetIds]
                        }

                        if (attachmentsToPersist.length > 0) {
                                await syncJobAttachments(
                                        tx,
                                        created.id,
                                        attachmentsToPersist,
                                        clientUserId,
                                        assetsToCleanup
                                )
                        }

                        return created
                })

                await cleanupRemovedAssetObjects(assetsToCleanup)

                return getJobPostById(job.id, clientUserId)
        } catch (error) {
                await cleanupUploadedAttachments(uploadedAttachments)
                throw error
        }
}

const updateJobPost = async (
        jobId: string,
        clientUserId: string,
        input: UpdateJobPostInput,
        options?: { attachmentFiles?: readonly Express.Multer.File[] }
) => {
        await ensureClientProfile(clientUserId)

        const job = await prismaClient.jobPost.findUnique({
                where: { id: jobId }
        })

        if (!job || job.clientId !== clientUserId) {
                throw new NotFoundException('Job post không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        if (input.specialtyId) {
                await ensureSpecialtyExists(input.specialtyId)
        }

        const normalizedSkills = input.skills ? normalizeSkills(input.skills) : undefined
        if (normalizedSkills) {
                await validateSkillIds(normalizedSkills)
        }

        const attachmentsFromBody =
                input.attachments !== undefined ? uniquePreserveOrder(input.attachments) : undefined
        if (attachmentsFromBody !== undefined) {
                await validateAssetIds(attachmentsFromBody)
        }

        const uploadedAttachments = await uploadAttachmentFiles(clientUserId, options?.attachmentFiles)

        const languages = input.languages ? normalizeLanguages(input.languages) : undefined

        const data: Prisma.JobPostUncheckedUpdateInput = {}

        if (input.specialtyId) data.specialtyId = input.specialtyId
        if (input.title) data.title = input.title
        if (input.description) data.description = input.description
        if (input.paymentMode) data.paymentMode = input.paymentMode
        if (input.formVersion !== undefined) data.formVersion = input.formVersion

        if (input.budgetAmount !== undefined) {
                data.budgetAmount = input.budgetAmount === null ? null : input.budgetAmount
        }

        if (input.budgetCurrency !== undefined) {
                data.budgetCurrency = input.budgetCurrency === null ? null : input.budgetCurrency
        }

        if (input.duration !== undefined) {
                data.duration = input.duration === null ? null : input.duration
        }

        if (input.experienceLevel) data.experienceLevel = input.experienceLevel
        if (input.locationType) data.locationType = input.locationType

        if (input.preferredLocations !== undefined) {
                data.preferredLocations =
                        input.preferredLocations === null
                                ? Prisma.DbNull
                                : (input.preferredLocations as Prisma.InputJsonValue)
        }

        if (input.customTerms !== undefined) {
                data.customTerms =
                        input.customTerms === null ? Prisma.DbNull : (input.customTerms as Prisma.InputJsonValue)
        }

        if (input.visibility) data.visibility = input.visibility

        if (input.status) {
                data.status = input.status
                if (input.status === JobStatus.PUBLISHED && job.status !== JobStatus.PUBLISHED) {
                        data.publishedAt = new Date()
                        data.closedAt = null
                } else if (input.status === JobStatus.CLOSED) {
                        data.closedAt = new Date()
                } else if (job.status === JobStatus.CLOSED) {
                        data.closedAt = null
                }
        }

        const assetsToCleanup: AssetCleanupTarget[] = []

        try {
                await prismaClient.$transaction(async tx => {
                        if (Object.keys(data).length > 0) {
                                await tx.jobPost.update({
                                        where: { id: jobId },
                                        data
                                })
                        }

                        if (languages) {
                                await syncJobLanguages(tx, jobId, languages)
                        }

                        if (normalizedSkills) {
                                await syncJobSkills(tx, jobId, normalizedSkills)
                        }

                        if (input.screeningQuestions) {
                                await syncScreeningQuestions(
                                        tx,
                                        jobId,
                                        input.screeningQuestions.map(question => ({
                                                question: question.question.trim(),
                                                isRequired: question.isRequired
                                        }))
                                )
                        }

                        let attachmentsToPersist =
                                attachmentsFromBody !== undefined ? [...attachmentsFromBody] : undefined

                        if (uploadedAttachments.length > 0) {
                                const base =
                                        attachmentsToPersist ?? (await fetchCurrentAttachmentAssetIds(tx, jobId))
                                const newAssetIds = await persistAttachmentUploads(
                                        tx,
                                        uploadedAttachments,
                                        clientUserId
                                )
                                attachmentsToPersist = [...base, ...newAssetIds]
                        }

                        if (attachmentsToPersist !== undefined) {
                                await syncJobAttachments(
                                        tx,
                                        jobId,
                                        attachmentsToPersist,
                                        clientUserId,
                                        assetsToCleanup
                                )
                        }
                })
        } catch (error) {
                await cleanupUploadedAttachments(uploadedAttachments)
                throw error
        }

        await cleanupRemovedAssetObjects(assetsToCleanup)

        return getJobPostById(jobId, clientUserId)
}

const getJobPostById = async (jobId: string, viewerId?: string) => {
        const job = await prismaClient.jobPost.findUnique({
                where: { id: jobId },
                include: jobPostDetailInclude
        })

        if (!job) {
                throw new NotFoundException('Job post không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        const isOwner = viewerId !== undefined && job.clientId === viewerId
        const isPublic = job.visibility === JobVisibility.PUBLIC

        if (!isOwner) {
                if (job.status !== JobStatus.PUBLISHED || !isPublic) {
                        throw new UnauthorizedException('Bạn không có quyền xem job post này', ErrorCode.USER_NOT_AUTHORITY)
                }
        }

        return serializeJobPost(job)
}

const listJobPosts = async (filters: JobPostFilterInput, viewerId?: string) => {
        const page = filters.page
        const limit = filters.limit
        const sortBy = filters.sortBy ?? 'newest'

        if (filters.budgetMin !== undefined && filters.budgetMax !== undefined && filters.budgetMin > filters.budgetMax) {
                throw new BadRequestException('budgetMin phải nhỏ hơn hoặc bằng budgetMax', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (filters.createdFrom && filters.createdTo && filters.createdFrom > filters.createdTo) {
                throw new BadRequestException('createdFrom phải nhỏ hơn hoặc bằng createdTo', ErrorCode.PARAM_QUERY_ERROR)
        }

        let clientId = filters.clientId

        if (filters.mine) {
                if (!viewerId) {
                        throw new UnauthorizedException('Bạn cần đăng nhập để xem danh sách job post của mình', ErrorCode.USER_NOT_AUTHORITY)
                }
                clientId = viewerId
        }

        const isOwnerScope = clientId !== undefined && viewerId !== undefined && clientId === viewerId

        let statuses = filters.statuses && filters.statuses.length > 0 ? uniquePreserveOrder(filters.statuses) as JobStatus[] : undefined

        if (!isOwnerScope) {
                if (!statuses || statuses.length === 0) {
                        statuses = [JobStatus.PUBLISHED]
                } else {
                        const restricted = statuses.some(status => status !== JobStatus.PUBLISHED)
                        if (restricted) {
                                throw new UnauthorizedException('Không thể xem job post ở trạng thái này', ErrorCode.USER_NOT_AUTHORITY)
                        }
                }
        }

        if (clientId && (!viewerId || clientId !== viewerId) && statuses) {
                const restricted = statuses.some(status => status !== JobStatus.PUBLISHED)
                if (restricted) {
                        throw new UnauthorizedException('Không thể xem job post ở trạng thái này', ErrorCode.USER_NOT_AUTHORITY)
                }
        }

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
                ? uniquePreserveOrder(filters.experienceLevels) as JobExperienceLevel[]
                : undefined
        const locationTypes = filters.locationTypes
                ? uniquePreserveOrder(filters.locationTypes) as JobLocationType[]
                : undefined

        const where = buildJobPostWhere({
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
                ...(clientId ? { clientId } : {}),
                ...(filters.hasAttachments !== undefined ? { hasAttachments: filters.hasAttachments } : {}),
                ...(filters.budgetMin !== undefined ? { budgetMin: filters.budgetMin } : {}),
                ...(filters.budgetMax !== undefined ? { budgetMax: filters.budgetMax } : {}),
                ...(filters.createdFrom ? { createdFrom: filters.createdFrom } : {}),
                ...(filters.createdTo ? { createdTo: filters.createdTo } : {})
        })

        const orderBy: Prisma.JobPostOrderByWithRelationInput =
                sortBy === 'oldest'
                        ? { createdAt: Prisma.SortOrder.asc }
                        : { createdAt: Prisma.SortOrder.desc }

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
                total,
                page,
                limit
        }
}

const deleteJobPost = async (jobId: string, clientUserId: string) => {
        await ensureClientProfile(clientUserId)

        const job = await prismaClient.jobPost.findUnique({
                where: { id: jobId }
        })

        if (!job || job.clientId !== clientUserId) {
                throw new NotFoundException('Job post không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        const assetsToCleanup: AssetCleanupTarget[] = []

        await prismaClient.$transaction(async tx => {
                const attachmentLinks = await tx.assetLink.findMany({
                        where: {
                                ownerType: OWNER_TYPE,
                                ownerId: jobId,
                                role: AssetRole.ATTACHMENT
                        }
                })

                if (attachmentLinks.length > 0) {
                        await tx.jobPostAttachment.deleteMany({ where: { jobId } })
                        await tx.assetLink.deleteMany({
                                where: {
                                        ownerType: OWNER_TYPE,
                                        ownerId: jobId,
                                        role: AssetRole.ATTACHMENT
                                }
                        })

                        const processed = new Set<string>()
                        for (const link of attachmentLinks) {
                                if (processed.has(link.assetId)) continue
                                processed.add(link.assetId)

                                const remaining = await tx.assetLink.count({ where: { assetId: link.assetId } })
                                if (remaining === 0) {
                                        const asset = await tx.asset.delete({
                                                where: { id: link.assetId },
                                                select: {
                                                        provider: true,
                                                        publicId: true,
                                                        bucket: true,
                                                        storageKey: true,
                                                        mimeType: true
                                                }
                                        })
                                        assetsToCleanup.push(asset)
                                }
                        }
                }

                await tx.jobPost.update({
                        where: { id: jobId },
                        data: {
                                isDeleted: true,
                                deletedAt: new Date(),
                                deletedBy: clientUserId
                        }
                })
        })

        await cleanupRemovedAssetObjects(assetsToCleanup)
}

export default {
        createJobPost,
        updateJobPost,
        getJobPostById,
        listJobPosts,
        deleteJobPost
}
