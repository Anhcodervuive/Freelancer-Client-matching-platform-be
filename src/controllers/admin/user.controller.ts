import { Request, Response } from 'express'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import {
    BanAdminUserSchema,
    ListAdminUsersQuerySchema,
    UnbanAdminUserSchema,
    UpdateAdminUserRoleSchema,
    UpdateAdminUserStatusSchema
} from '~/schema/admin-user.schema'
import adminUserService from '~/services/admin-user.service'
import { ensureAdminUser } from './utils'
import { Role } from '~/generated/prisma'

export const listAdminUsers = async (req: Request, res: Response) => {
    ensureAdminUser(req)

    const query = ListAdminUsersQuerySchema.parse(req.query)
    const page = query.page ? Number(query.page) : 1
    const limit = query.limit ? Number(query.limit) : 20

    if (!Number.isFinite(page) || page < 1) {
        throw new BadRequestException('Tham số page không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
    }

    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
        throw new BadRequestException('Tham số limit không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
    }

    const isActive =
        query.isActive === undefined ? undefined : query.isActive === 'true'

    const listParams: {
        page: number
        limit: number
        role?: Role
        isActive?: boolean
        search?: string
    } = {
        page,
        limit
    }

    if (query.role) {
        listParams.role = query.role
    }

    if (isActive !== undefined) {
        listParams.isActive = isActive
    }

    if (query.search !== undefined) {
        listParams.search = query.search
    }

    const { data, total } = await adminUserService.listUsers(listParams)

    return res.json({
        data,
        meta: { page, limit, total }
    })
}

export const getAdminUserDetail = async (req: Request, res: Response) => {
    ensureAdminUser(req)

    const { userId } = req.params

    if (!userId) {
        throw new BadRequestException('Thiếu userId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const user = await adminUserService.getUserById(userId)

    return res.json({ data: user })
}

export const updateAdminUserRole = async (req: Request, res: Response) => {
    const admin = ensureAdminUser(req)
    const { userId } = req.params

    if (!userId) {
        throw new BadRequestException('Thiếu userId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const payload = UpdateAdminUserRoleSchema.parse(req.body)
    const user = await adminUserService.updateUserRole(admin.id, userId, payload)

    return res.json({ data: user })
}

export const updateAdminUserStatus = async (req: Request, res: Response) => {
    const admin = ensureAdminUser(req)
    const { userId } = req.params

    if (!userId) {
        throw new BadRequestException('Thiếu userId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const payload = UpdateAdminUserStatusSchema.parse(req.body)
    const user = await adminUserService.updateUserStatus(admin.id, userId, payload)

    return res.json({ data: user })
}

export const banAdminUser = async (req: Request, res: Response) => {
    const admin = ensureAdminUser(req)
    const { userId } = req.params

    if (!userId) {
        throw new BadRequestException('Thiếu userId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const payload = BanAdminUserSchema.parse(req.body)
    const user = await adminUserService.banUser(admin.id, userId, payload)

    return res.json({ data: user })
}

export const unbanAdminUser = async (req: Request, res: Response) => {
    const admin = ensureAdminUser(req)
    const { userId } = req.params

    if (!userId) {
        throw new BadRequestException('Thiếu userId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const payload = UnbanAdminUserSchema.parse(req.body)
    const user = await adminUserService.unbanUser(admin.id, userId, payload)

    return res.json({ data: user })
}
