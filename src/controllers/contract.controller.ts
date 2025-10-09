import type { Express } from 'express'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { ContractListFilterSchema, CreateContractMilestoneSchema } from '~/schema/contract.schema'
import contractService from '~/services/contract.service'

const RESOURCE_FILE_FIELD_NAMES = new Set(['resourceFiles', 'resourceFiles[]', 'files', 'files[]'])

const extractResourceFiles = (files: Request['files']): Express.Multer.File[] => {
        if (!files) return []

        if (Array.isArray(files)) {
                return (files as Express.Multer.File[]).filter(file => RESOURCE_FILE_FIELD_NAMES.has(file.fieldname))
        }

        const map = files as Record<string, Express.Multer.File[] | undefined>

        return Array.from(RESOURCE_FILE_FIELD_NAMES).flatMap(fieldName => map[fieldName] ?? [])
}

export const listContracts = async (req: Request, res: Response) => {
        const userId = req.user?.id

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem hợp đồng', ErrorCode.UNAUTHORIED)
        }

        const filters = ContractListFilterSchema.parse(req.query)
        const result = await contractService.listContracts(userId, filters)

        return res.status(StatusCodes.OK).json(result)
}

export const getContractDetail = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { contractId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem hợp đồng', ErrorCode.UNAUTHORIED)
        }

        if (!contractId) {
                throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const contract = await contractService.getContractDetail(userId, contractId)

        return res.status(StatusCodes.OK).json(contract)
}

export const listContractMilestones = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { contractId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem milestone', ErrorCode.UNAUTHORIED)
        }

        if (!contractId) {
                throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const milestones = await contractService.listContractMilestones(userId, contractId)

        return res.status(StatusCodes.OK).json({
                contractId,
                milestones
        })
}

export const listMilestoneResources = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { contractId, milestoneId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem tài nguyên milestone', ErrorCode.UNAUTHORIED)
        }

        if (!contractId || !milestoneId) {
                throw new BadRequestException('Thiếu tham số contractId hoặc milestoneId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const resources = await contractService.listMilestoneResources(userId, contractId, milestoneId)

        return res.status(StatusCodes.OK).json({
                contractId,
                milestoneId,
                resources
        })
}

export const createContractMilestone = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { contractId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để tạo milestone', ErrorCode.UNAUTHORIED)
        }

        if (!contractId) {
                throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const payload = CreateContractMilestoneSchema.parse(req.body)
        const milestone = await contractService.createContractMilestone(userId, contractId, payload)

        return res.status(StatusCodes.CREATED).json(milestone)
}

export const uploadMilestoneResources = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { contractId, milestoneId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để tải tài nguyên lên milestone', ErrorCode.UNAUTHORIED)
        }

        if (!contractId || !milestoneId) {
                throw new BadRequestException('Thiếu tham số contractId hoặc milestoneId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const files = extractResourceFiles(req.files)

        const resources = await contractService.uploadMilestoneResources(userId, contractId, milestoneId, files)

        return res.status(StatusCodes.CREATED).json({
                contractId,
                milestoneId,
                resources
        })
}

export const deleteMilestoneResource = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { contractId, milestoneId, resourceId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xóa tài nguyên milestone', ErrorCode.UNAUTHORIED)
        }

        if (!contractId || !milestoneId || !resourceId) {
                throw new BadRequestException('Thiếu tham số contractId, milestoneId hoặc resourceId', ErrorCode.PARAM_QUERY_ERROR)
        }

        await contractService.deleteMilestoneResource(userId, contractId, milestoneId, resourceId)

        return res.status(StatusCodes.NO_CONTENT).send()
}
