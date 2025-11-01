import { Prisma, Role } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import {
    UpdateAdminUserRoleInput,
    UpdateAdminUserStatusInput
} from '~/schema/admin-user.schema'

const adminUserSelect = Prisma.validator<Prisma.UserSelect>()({
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
})

type AdminUserRecord = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>

type ListUsersParams = {
    page: number
    limit: number
    role?: Role
    isActive?: boolean
    search?: string
}

const serializeAdminUser = (record: AdminUserRecord) => ({
    id: record.id,
    email: record.email,
    role: record.role,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    activeBan: record.bans[0]
        ? {
              id: record.bans[0].id,
              reason: record.bans[0].reason,
              note: record.bans[0].note,
              expiresAt: record.bans[0].expiresAt,
              createdAt: record.bans[0].createdAt,
              admin: record.bans[0].admin
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
})

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

    return {
        data: records.map(serializeAdminUser),
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

type TransactionDelegate = Pick<typeof prismaClient, 'user' | 'userBan'>

const ensureAnotherActiveAdminExists = async (tx: TransactionDelegate, userId: string) => {
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

const getActiveBan = (tx: TransactionDelegate, userId: string) =>
    tx.userBan.findFirst({
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
    if (requesterId === userId && payload.status !== 'activate') {
        throw new BadRequestException('Không thể tự vô hiệu hoá hoặc cấm tài khoản của bạn', ErrorCode.USER_NOT_AUTHORITY)
    }

    return prismaClient.$transaction(async tx => {
        const existing = await tx.user.findUnique({ where: { id: userId } })

        if (!existing) {
            throw new NotFoundException('Không tìm thấy người dùng', ErrorCode.ITEM_NOT_FOUND)
        }

        if (
            existing.role === Role.ADMIN &&
            (payload.status === 'deactivate' || payload.status === 'ban')
        ) {
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
        } else if (payload.status === 'deactivate') {
            if (existing.isActive) {
                await tx.user.update({
                    where: { id: userId },
                    data: { isActive: false }
                })
            }
        } else if (payload.status === 'ban') {
            if (activeBan) {
                throw new BadRequestException('Người dùng đang bị cấm hoạt động', ErrorCode.USER_NOT_AUTHORITY)
            }

            if (existing.isActive) {
                await tx.user.update({
                    where: { id: userId },
                    data: { isActive: false }
                })
            }

            await tx.userBan.create({
                data: {
                    userId,
                    adminId: requesterId,
                    reason: payload.reason,
                    note: payload.note ?? null,
                    expiresAt: payload.expiresAt ?? null
                }
            })
        } else if (payload.status === 'unban') {
            if (!activeBan) {
                throw new BadRequestException('Người dùng không có lệnh cấm đang hiệu lực', ErrorCode.USER_NOT_AUTHORITY)
            }

            await tx.userBan.update({
                where: { id: activeBan.id },
                data: {
                    liftedAt: new Date(),
                    liftedById: requesterId
                }
            })

            if (payload.reactivate && !existing.isActive) {
                await tx.user.update({
                    where: { id: userId },
                    data: { isActive: true }
                })
            }
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

export default {
    listUsers,
    getUserById,
    updateUserRole,
    updateUserStatus
}
