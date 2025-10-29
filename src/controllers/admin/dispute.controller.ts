import { Request, Response } from 'express'

import adminDisputeService from '~/services/admin-dispute.service'
import {
    AdminDisputeListQuerySchema,
    AdminJoinDisputeSchema,
    AdminRequestArbitrationFeesSchema,
    AdminLockDisputeSchema,
    AdminGenerateArbitrationDossierSchema,
    AdminAssignArbitratorSchema,
    AdminListDisputeDossiersSchema
} from '~/schema/dispute.schema'
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

export const listArbitrators = async (req: Request, res: Response) => {
    ensureAdminUser(req)

    const arbitrators = await adminDisputeService.listArbitrators()

    return res.json({ data: arbitrators })
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

export const requestArbitrationFees = async (req: Request, res: Response) => {
    const adminId = ensureAdminUser(req)
    const { disputeId } = req.params

    if (!disputeId) {
        throw new BadRequestException('Thiếu disputeId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const payload = AdminRequestArbitrationFeesSchema.parse(req.body)
    const result = await adminDisputeService.requestArbitrationFees(adminId, disputeId, payload)

    return res.json(result)
}

export const lockDisputeForArbitration = async (req: Request, res: Response) => {
    const adminId = ensureAdminUser(req)
    const { disputeId } = req.params

    if (!disputeId) {
        throw new BadRequestException('Thiếu disputeId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const payload = AdminLockDisputeSchema.parse(req.body)
    const result = await adminDisputeService.lockDispute(adminId, disputeId, payload)

    return res.json(result)
}

export const generateArbitrationDossier = async (req: Request, res: Response) => {
    const adminId = ensureAdminUser(req)
    const { disputeId } = req.params

    if (!disputeId) {
        throw new BadRequestException('Thiếu disputeId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const payload = AdminGenerateArbitrationDossierSchema.parse(req.body)
    const result = await adminDisputeService.generateArbitrationDossier(adminId, disputeId, payload)

    return res.json(result)
}

export const listDisputeDossiers = async (req: Request, res: Response) => {
    ensureAdminUser(req)

    const { disputeId } = req.params

    if (!disputeId) {
        throw new BadRequestException('Thiếu disputeId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const query = AdminListDisputeDossiersSchema.parse(req.query)
    const result = await adminDisputeService.listDisputeDossiers(disputeId, query)

    return res.json(result)
}

export const downloadDisputeDossierPdf = async (req: Request, res: Response) => {
    ensureAdminUser(req)

    const { disputeId, dossierId } = req.params

    if (!disputeId) {
        throw new BadRequestException('Thiếu disputeId', ErrorCode.PARAM_QUERY_ERROR)
    }

    if (!dossierId) {
        throw new BadRequestException('Thiếu dossierId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const { buffer, filename } = await adminDisputeService.getDisputeDossierPdf(disputeId, dossierId)
    const safeFilename = filename.replace(/"/g, '')
    const encodedFilename = encodeURIComponent(safeFilename)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
    )
    res.setHeader('Content-Length', buffer.length)

    return res.status(200).send(buffer)
}

export const assignArbitratorToDispute = async (req: Request, res: Response) => {
    const adminId = ensureAdminUser(req)
    const { disputeId } = req.params

    if (!disputeId) {
        throw new BadRequestException('Thiếu disputeId', ErrorCode.PARAM_QUERY_ERROR)
    }

    const payload = AdminAssignArbitratorSchema.parse(req.body)
    const result = await adminDisputeService.assignArbitrator(adminId, disputeId, payload)

    return res.json(result)
}
