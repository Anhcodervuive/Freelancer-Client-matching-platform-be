import { Request, Response } from 'express'

import adminDisputeService from '~/services/admin-dispute.service'
import { Role } from '~/generated/prisma'
import { ForbiddenException } from '~/exceptions/Forbidden'
import { ErrorCode } from '~/exceptions/root'
import { BadRequestException } from '~/exceptions/bad-request'

const ensureArbitratorUser = (req: Request) => {
    const user = req.user

    if (!user || user.role !== 'ARBITRATOR') {
        throw new ForbiddenException(
            'Chỉ trọng tài mới được phép truy cập tính năng này',
            ErrorCode.FORBIDDEN
        )
    }

    return user.id
}

export const listAssignedDisputes = async (req: Request, res: Response) => {
    const arbitratorId = ensureArbitratorUser(req)

    const result = await adminDisputeService.listArbitratorAssignedDisputes(arbitratorId)

    return res.json(result)
}

export const getAssignedDispute = async (req: Request, res: Response) => {
    const arbitratorId = ensureArbitratorUser(req)
    const { disputeId } = req.params

    if (!disputeId) {
        throw new BadRequestException('Thiếu disputeId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const result = await adminDisputeService.getArbitratorAssignedDispute(arbitratorId, disputeId)

    return res.json(result)
}

export const getArbitrationContext = async (req: Request, res: Response) => {
    const arbitratorId = ensureArbitratorUser(req)
    const { disputeId } = req.params

    if (!disputeId) {
        throw new BadRequestException('Thiếu disputeId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const result = await adminDisputeService.getArbitrationContext(
        { role: Role.ARBITRATOR, userId: arbitratorId },
        disputeId
    )

    return res.json(result)
}
