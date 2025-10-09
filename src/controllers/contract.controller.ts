import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { ContractListFilterSchema, CreateContractMilestoneSchema } from '~/schema/contract.schema'
import contractService from '~/services/contract.service'

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
