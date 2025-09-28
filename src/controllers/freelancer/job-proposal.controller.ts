import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import {
        CreateJobProposalSchema,
        JobProposalFilterSchema,
        UpdateJobProposalSchema
} from '~/schema/job-proposal.schema'
import freelancerJobProposalService from '~/services/freelancer/job-proposal.service'

export const listJobProposals = async (req: Request, res: Response) => {
        const userId = req.user?.id

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem proposal', ErrorCode.UNAUTHORIED)
        }

        const filters = JobProposalFilterSchema.parse(req.query)
        const result = await freelancerJobProposalService.listJobProposals(userId, filters)

        return res.status(StatusCodes.OK).json(result)
}

export const getJobProposalDetail = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { proposalId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem proposal', ErrorCode.UNAUTHORIED)
        }

        if (!proposalId) {
                throw new BadRequestException('Thiếu tham số proposalId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const proposal = await freelancerJobProposalService.getJobProposalDetail(userId, proposalId)

        return res.status(StatusCodes.OK).json(proposal)
}

export const createJobProposal = async (req: Request, res: Response) => {
        const userId = req.user?.id

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để gửi proposal', ErrorCode.UNAUTHORIED)
        }

        const payload = CreateJobProposalSchema.parse(req.body)
        const proposal = await freelancerJobProposalService.createJobProposal(userId, payload)

        return res.status(StatusCodes.CREATED).json(proposal)
}

export const updateJobProposal = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { proposalId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để cập nhật proposal', ErrorCode.UNAUTHORIED)
        }

        if (!proposalId) {
                throw new BadRequestException('Thiếu tham số proposalId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const payload = UpdateJobProposalSchema.parse(req.body)
        const proposal = await freelancerJobProposalService.updateJobProposal(userId, proposalId, payload)

        return res.status(StatusCodes.OK).json(proposal)
}

export const withdrawJobProposal = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { proposalId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để rút proposal', ErrorCode.UNAUTHORIED)
        }

        if (!proposalId) {
                throw new BadRequestException('Thiếu tham số proposalId', ErrorCode.PARAM_QUERY_ERROR)
        }

        await freelancerJobProposalService.withdrawJobProposal(userId, proposalId)

        return res.status(StatusCodes.NO_CONTENT).send()
}
