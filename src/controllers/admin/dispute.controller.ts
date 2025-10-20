import { Request, Response } from 'express'

import adminDisputeService from '~/services/admin-dispute.service'
import { AdminDisputeListQuerySchema, AdminJoinDisputeSchema } from '~/schema/dispute.schema'
import { ForbiddenException } from '~/exceptions/Forbidden'
import { ErrorCode } from '~/exceptions/root'
import { BadRequestException } from '~/exceptions/bad-request'

const ensureAdminUser = (req: Request) => {
    const user = req.user

    if (!user || user.role !== 'ADMIN') {
        throw new ForbiddenException('Chỉ admin mới được phép truy cập tính năng này', ErrorCode.FORBIDDEN)
    }

    return user.id
}

export const listAdminDisputes = async (req: Request, res: Response) => {
    ensureAdminUser(req)

    const filters = AdminDisputeListQuerySchema.parse(req.query)
    const result = await adminDisputeService.listDisputes(filters)

    return res.json(result)
}

export const getAdminDispute = async (req: Request, res: Response) => {
    ensureAdminUser(req)

    const { disputeId } = req.params

    if (!disputeId) {
        throw new BadRequestException('Thiếu disputeId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const result = await adminDisputeService.getDispute(disputeId)

    return res.json(result)
}

export const joinDisputeAsAdmin = async (req: Request, res: Response) => {
    const adminId = ensureAdminUser(req)
    const { disputeId } = req.params

    if (!disputeId) {
        throw new BadRequestException('Thiếu disputeId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const payload = AdminJoinDisputeSchema.parse(req.body)
    const result = await adminDisputeService.joinDispute(adminId, disputeId, payload)

    return res.json(result)
}
