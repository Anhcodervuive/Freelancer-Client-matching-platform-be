import { Prisma, Role } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import assetService from './asset.service'
import { sendUserBanEmail, sendUserUnbanEmail } from '~/providers/mail.provider'
import {
    BanAdminUserInput,
    UnbanAdminUserInput,
    UpdateAdminUserRoleInput,
    UpdateAdminUserStatusInput
} from '~/schema/admin-user.schema'

const adminUserSelect = {
    id: true,
    email: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    profile: {
        select: {
            userId: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            country: true,
            city: true,
            district: true,
            address: true,
            client: { select: { userId: true } },
            freelancer: { select: { userId: true } }
        }
    },
    bans: {
        where: { liftedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
            id: true,
            reason: true,
            note: true,
            expiresAt: true,
            createdAt: true,
            admin: {
                select: {
                    id: true,
                    email: true
                }
            }
        }
    }
} as const

type AdminUserRecord = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>
type ActiveBanRecord = {
    id: string
    reason: string
    note: string | null
    expiresAt: Date | null
    createdAt: Date
    admin: {
        id: string
        email: string
    }
}

type ListUsersParams = {
    page: number
    limit: number
    role?: Role
    isActive?: boolean
    search?: string
}

const getProfileFullName = (
    profile?: {
        firstName?: string | null
        lastName?: string | null
    } | null
) => {
    const firstName = profile?.firstName?.trim()
    const lastName = profile?.lastName?.trim()
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()

    return fullName.length > 0 ? fullName : null
}

const serializeAdminUser = async (record: AdminUserRecord) => {
    const [activeBanRecord] = record.bans as ActiveBanRecord[]
    const avatar = await assetService.getProfileAvatarUrl(record.id)

    return {
        id: record.id,
        email: record.email,
        role: record.role,
        isActive: record.isActive,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        avatar,
        activeBan: activeBanRecord
            ? {
                  id: activeBanRecord.id,
                  reason: activeBanRecord.reason,
                  note: activeBanRecord.note,
                  expiresAt: activeBanRecord.expiresAt,
                  createdAt: activeBanRecord.createdAt,
                  admin: activeBanRecord.admin
              }
            : null,
        profile: record.profile
            ? {
                  firstName: record.profile.firstName,
                  lastName: record.profile.lastName,
                  phoneNumber: record.profile.phoneNumber,
                  country: record.profile.country,
                  city: record.profile.city,
                  district: record.profile.district,
                  address: record.profile.address
              }
            : null,
        hasClientProfile: Boolean(record.profile?.client),
        hasFreelancerProfile: Boolean(record.profile?.freelancer)
    }
}

const listUsers = async ({ page, limit, role, isActive, search }: ListUsersParams) => {
    const filters: Prisma.UserWhereInput[] = []

    if (role) {
        filters.push({ role })
    }

    if (typeof isActive === 'boolean') {
        filters.push({ isActive })
    }

    const keyword = search?.trim()
    if (keyword) {
        filters.push({
            OR: [
                { email: { contains: keyword } },
                { profile: { firstName: { contains: keyword } } },
                { profile: { lastName: { contains: keyword } } },
                { profile: { phoneNumber: { contains: keyword } } }
            ]
        })
    }

    const where: Prisma.UserWhereInput = filters.length ? { AND: filters } : {}

    const [records, total] = await prismaClient.$transaction([
        prismaClient.user.findMany({
            where,
            select: adminUserSelect,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit
        }),
        prismaClient.user.count({ where })
    ])

    const data = await Promise.all(records.map(record => serializeAdminUser(record)))

    return {
        data,
        total
    }
}

const getUserById = async (userId: string) => {
    const user = await prismaClient.user.findUnique({
        where: { id: userId },
        select: adminUserSelect
    })

    if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng', ErrorCode.ITEM_NOT_FOUND)
    }

    return serializeAdminUser(user)
}

const ensureAnotherActiveAdminExists = async (tx: any, userId: string) => {
    const remaining = await tx.user.count({
        where: {
            id: { not: userId },
            role: Role.ADMIN,
            isActive: true
        }
    })

    if (remaining === 0) {
        throw new BadRequestException('Không thể loại bỏ admin hoạt động cuối cùng', ErrorCode.USER_NOT_AUTHORITY)
    }
}

const getActiveBan = (tx: any, userId: string) =>
    (tx as any).userBan.findFirst({
        where: {
            userId,
            liftedAt: null
        },
        orderBy: { createdAt: 'desc' }
    })

const updateUserRole = async (requesterId: string, userId: string, payload: UpdateAdminUserRoleInput) => {
    if (requesterId === userId && payload.role !== Role.ADMIN) {
        throw new BadRequestException('Không thể thay đổi vai trò của chính bạn', ErrorCode.USER_NOT_AUTHORITY)
    }

    return prismaClient.$transaction(async tx => {
        const existing = await tx.user.findUnique({ where: { id: userId } })

        if (!existing) {
            throw new NotFoundException('Không tìm thấy người dùng', ErrorCode.ITEM_NOT_FOUND)
        }

        if (existing.role === Role.ADMIN && payload.role !== Role.ADMIN) {
            await ensureAnotherActiveAdminExists(tx, userId)
        }

        await tx.profile.upsert({
            where: { userId },
            create: { userId },
            update: {}
        })

        if (payload.role === Role.CLIENT) {
            await tx.freelancer.deleteMany({ where: { userId } })
            await tx.client.upsert({ where: { userId }, create: { userId }, update: {} })
        } else if (payload.role === Role.FREELANCER) {
            await tx.client.deleteMany({ where: { userId } })
            await tx.freelancer.upsert({ where: { userId }, create: { userId }, update: {} })
        } else {
            await tx.client.deleteMany({ where: { userId } })
            await tx.freelancer.deleteMany({ where: { userId } })
        }

        const updated = await tx.user.update({
            where: { id: userId },
            data: { role: payload.role },
            select: adminUserSelect
        })

        return serializeAdminUser(updated)
    })
}

const updateUserStatus = async (
    requesterId: string,
    userId: string,
    payload: UpdateAdminUserStatusInput
) => {
    if (requesterId === userId && payload.status === 'deactivate') {
        throw new BadRequestException('Không thể tự vô hiệu hoá tài khoản của bạn', ErrorCode.USER_NOT_AUTHORITY)
    }

    return prismaClient.$transaction(async tx => {
        const existing = await tx.user.findUnique({ where: { id: userId } })

        if (!existing) {
            throw new NotFoundException('Không tìm thấy người dùng', ErrorCode.ITEM_NOT_FOUND)
        }

        if (existing.role === Role.ADMIN && payload.status === 'deactivate') {
            await ensureAnotherActiveAdminExists(tx, userId)
        }

        const activeBan = await getActiveBan(tx, userId)

        if (payload.status === 'activate') {
            if (activeBan) {
                throw new BadRequestException(
                    'Người dùng đang bị cấm, cần gỡ ban trước khi kích hoạt',
                    ErrorCode.USER_NOT_AUTHORITY
                )
            }

            if (!existing.isActive) {
                await tx.user.update({
                    where: { id: userId },
                    data: { isActive: true }
                })
            }
        } else if (payload.status === 'deactivate' && existing.isActive) {
            await tx.user.update({
                where: { id: userId },
                data: { isActive: false }
            })
        }

        const updated = await tx.user.findUnique({
            where: { id: userId },
            select: adminUserSelect
        })

        if (!updated) {
            throw new NotFoundException('Không tìm thấy người dùng', ErrorCode.ITEM_NOT_FOUND)
        }

        return serializeAdminUser(updated)
    })
}

const banUser = async (requesterId: string, userId: string, payload: BanAdminUserInput) => {
    if (requesterId === userId) {
        throw new BadRequestException('Không thể tự cấm tài khoản của bạn', ErrorCode.USER_NOT_AUTHORITY)
    }

    const user = await prismaClient.$transaction(async tx => {
        const existing = await tx.user.findUnique({ where: { id: userId } })

        if (!existing) {
            throw new NotFoundException('Không tìm thấy người dùng', ErrorCode.ITEM_NOT_FOUND)
        }

        if (existing.role === Role.ADMIN) {
            await ensureAnotherActiveAdminExists(tx, userId)
        }

        const activeBan = await getActiveBan(tx, userId)

        if (activeBan) {
            throw new BadRequestException('Người dùng đang bị cấm hoạt động', ErrorCode.USER_NOT_AUTHORITY)
        }

        if (existing.isActive) {
            await tx.user.update({
                where: { id: userId },
                data: { isActive: false }
            })
        }

        await (tx as any).userBan.create({
            data: {
                userId,
                adminId: requesterId,
                reason: payload.reason,
                note: payload.note ?? null,
                expiresAt: payload.expiresAt ?? null
            }
        })

        const updated = await tx.user.findUnique({
            where: { id: userId },
            select: adminUserSelect
        })

        if (!updated) {
            throw new NotFoundException('Không tìm thấy người dùng', ErrorCode.ITEM_NOT_FOUND)
        }

        return serializeAdminUser(updated)
    })

    if (user.activeBan) {
        const recipientName = getProfileFullName(user.profile) ?? user.email

        await sendUserBanEmail(user.email, {
            recipientName,
            reason: user.activeBan.reason,
            note: user.activeBan.note,
            expiresAt: user.activeBan.expiresAt
        })
    }

    return user
}

const unbanUser = async (requesterId: string, userId: string, payload: UnbanAdminUserInput) => {
    if (requesterId === userId) {
        throw new BadRequestException('Không thể tự gỡ lệnh cấm của bạn', ErrorCode.USER_NOT_AUTHORITY)
    }

    const { user, previousBan, wasReactivated } = await prismaClient.$transaction(async tx => {
        const existing = await tx.user.findUnique({ where: { id: userId } })

        if (!existing) {
            throw new NotFoundException('Không tìm thấy người dùng', ErrorCode.ITEM_NOT_FOUND)
        }

        const activeBan = await getActiveBan(tx, userId)

        if (!activeBan) {
            throw new BadRequestException('Người dùng không có lệnh cấm đang hiệu lực', ErrorCode.USER_NOT_AUTHORITY)
        }

        const shouldReactivate = Boolean(payload.reactivate && !existing.isActive)

        await (tx as any).userBan.update({
            where: { id: activeBan.id },
            data: {
                liftedAt: new Date(),
                liftedById: requesterId
            }
        })

        if (shouldReactivate) {
            await tx.user.update({
                where: { id: userId },
                data: { isActive: true }
            })
        }

        const updated = await tx.user.findUnique({
            where: { id: userId },
            select: adminUserSelect
        })

        if (!updated) {
            throw new NotFoundException('Không tìm thấy người dùng', ErrorCode.ITEM_NOT_FOUND)
        }

        const serialized = await serializeAdminUser(updated)

        return {
            user: serialized,
            previousBan: activeBan,
            wasReactivated: shouldReactivate
        }
    })

    if (previousBan) {
        const recipientName = getProfileFullName(user.profile) ?? user.email

        await sendUserUnbanEmail(user.email, {
            recipientName,
            reason: previousBan.reason,
            note: previousBan.note,
            reactivated: wasReactivated
        })
    }

    return user
}

export default {
    listUsers,
    getUserById,
    updateUserRole,
    updateUserStatus,
    banUser,
    unbanUser
}
