import type { Prisma } from '~/generated/prisma'
import { PlatformTermsStatus, Prisma as PrismaNS } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import {
        CreatePlatformTermsInput,
        PlatformTermsListQuery,
        UpdatePlatformTermsInput
} from '~/schema/platform-terms.schema'

const platformTermsSelect = PrismaNS.validator<Prisma.PlatformTermsSelect>()({
        id: true,
        version: true,
        title: true,
        body: true,
        status: true,
        effectiveFrom: true,
        effectiveTo: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
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
        }
})

type PlatformTermsRecord = Prisma.PlatformTermsGetPayload<{ select: typeof platformTermsSelect }>

const composeFullName = (profile?: { firstName: string | null; lastName: string | null } | null) => {
        const firstName = profile?.firstName?.trim() ?? ''
        const lastName = profile?.lastName?.trim() ?? ''
        const fullName = `${firstName} ${lastName}`.trim()
        return fullName.length > 0 ? fullName : null
}

const serializePlatformTerms = (
        record: PlatformTermsRecord,
        options: { includeCreator?: boolean } = {}
) => {
        const includeCreator = options.includeCreator ?? true
        const creatorProfile = record.createdBy?.profile ?? null

        return {
                id: record.id,
                version: record.version,
                title: record.title,
                body: record.body,
                status: record.status,
                effectiveFrom: record.effectiveFrom ?? null,
                effectiveTo: record.effectiveTo ?? null,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
                createdBy: includeCreator
                        ? record.createdBy
                                ? {
                                          id: record.createdBy.id,
                                          email: record.createdBy.email,
                                          firstName: creatorProfile?.firstName ?? null,
                                          lastName: creatorProfile?.lastName ?? null,
                                          displayName: composeFullName(creatorProfile)
                                  }
                                : null
                        : undefined
        }
}

const normalizeJsonInput = (value: unknown): Prisma.InputJsonValue | typeof PrismaNS.JsonNull => {
        return value === null ? PrismaNS.JsonNull : (value as Prisma.InputJsonValue)
}

const fetchLatestActiveTerms = (executor: any) =>
        executor.platformTerms.findFirst({
                where: { status: PlatformTermsStatus.ACTIVE },
                orderBy: [
                        { effectiveFrom: 'desc' },
                        { createdAt: 'desc' }
                ]
        })

const ensureLatestActiveTermsRecord = async (client?: any) => {
        const executor = client ?? prismaClient
        const record = await fetchLatestActiveTerms(executor)

        if (!record) {
                throw new BadRequestException('Chưa cấu hình điều khoản nền tảng', ErrorCode.PARAM_QUERY_ERROR)
        }

        return record as PlatformTermsRecord
}

const listTerms = async ({ page, limit, status, search }: PlatformTermsListQuery) => {
        const skip = (page - 1) * limit
        const filters: Prisma.PlatformTermsWhereInput[] = []

        if (status) {
                filters.push({ status })
        }

        const keyword = search?.trim()
        if (keyword) {
                filters.push({
                        OR: [{ version: { contains: keyword } }, { title: { contains: keyword } }]
                })
        }

        const where: Prisma.PlatformTermsWhereInput = filters.length > 0 ? { AND: filters } : {}

        const records = await prismaClient.platformTerms.findMany({
                where,
                select: platformTermsSelect,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
        })
        const total = await prismaClient.platformTerms.count({ where })

        const data = records.map(record => serializePlatformTerms(record))
        const totalPages = Math.ceil(total / limit)

        return {
                data,
                pagination: {
                        page,
                        limit,
                        total,
                        totalPages
                }
        }
}

const getTermById = async (termsId: string) => {
        const record = await prismaClient.platformTerms.findUnique({
                where: { id: termsId },
                select: platformTermsSelect
        })

        if (!record) {
                throw new NotFoundException('Không tìm thấy điều khoản nền tảng', ErrorCode.ITEM_NOT_FOUND)
        }

        return serializePlatformTerms(record)
}

const getPublicTermsByVersion = async (version: string) => {
        const record = await prismaClient.platformTerms.findFirst({
                where: {
                        version,
                        status: { not: PlatformTermsStatus.DRAFT }
                },
                select: platformTermsSelect
        })

        if (!record) {
                throw new NotFoundException('Không tìm thấy điều khoản tương ứng', ErrorCode.ITEM_NOT_FOUND)
        }

        return serializePlatformTerms(record, { includeCreator: false })
}

const getLatestActiveTerms = async () => {
        const record = await fetchLatestActiveTerms(prismaClient)

        if (!record) {
                throw new NotFoundException('Không tìm thấy điều khoản đang hiệu lực', ErrorCode.ITEM_NOT_FOUND)
        }

        return serializePlatformTerms(record as PlatformTermsRecord, { includeCreator: false })
}

const createTerms = async (adminId: string, payload: CreatePlatformTermsInput) => {
        const data: Prisma.PlatformTermsCreateInput = {
                version: payload.version,
                title: payload.title,
                body: normalizeJsonInput(payload.body),
                status: payload.status,
                effectiveFrom: payload.effectiveFrom ?? null,
                effectiveTo: payload.effectiveTo ?? null
        }

        if (adminId) {
                data.createdBy = { connect: { id: adminId } }
        }

        if (payload.status === PlatformTermsStatus.ACTIVE && !data.effectiveFrom) {
                data.effectiveFrom = new Date()
        }

        const record = await prismaClient.platformTerms.create({
                data,
                select: platformTermsSelect
        })

        return serializePlatformTerms(record)
}

const updateTerms = async (termsId: string, _adminId: string, payload: UpdatePlatformTermsInput) => {
        const existing = await prismaClient.platformTerms.findUnique({
                where: { id: termsId },
                select: { id: true, status: true, effectiveFrom: true }
        })

        if (!existing) {
                throw new NotFoundException('Không tìm thấy điều khoản nền tảng', ErrorCode.ITEM_NOT_FOUND)
        }

        const data: Prisma.PlatformTermsUpdateInput = {}

        if (payload.version !== undefined) {
                data.version = payload.version
        }

        if (payload.title !== undefined) {
                data.title = payload.title
        }

        if (payload.body !== undefined) {
                data.body = normalizeJsonInput(payload.body)
        }

        if (payload.status !== undefined) {
                data.status = payload.status
        }

        if (payload.effectiveFrom !== undefined) {
                data.effectiveFrom = payload.effectiveFrom ?? null
        }

        if (payload.effectiveTo !== undefined) {
                data.effectiveTo = payload.effectiveTo ?? null
        }

        if (payload.status === PlatformTermsStatus.ACTIVE) {
                if (!payload.effectiveFrom && !existing.effectiveFrom) {
                        data.effectiveFrom = new Date()
                }
        }

        const record = await prismaClient.platformTerms.update({
                where: { id: termsId },
                data,
                select: platformTermsSelect
        })

        return serializePlatformTerms(record)
}

const platformTermsService = {
        listTerms,
        getTermById,
        createTerms,
        updateTerms,
        getLatestActiveTerms,
        getPublicTermsByVersion,
        ensureLatestActiveTermsRecord
}

export default platformTermsService
