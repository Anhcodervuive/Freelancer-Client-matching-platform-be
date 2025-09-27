import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import {
        CreateJobInvitationSchema,
        JobInvitationFilterSchema
} from '~/schema/job-invitation.schema'
import jobInvitationService from '~/services/client/job-invitation.service'

export const inviteFreelancerToJob = async (req: Request, res: Response) => {
        const userId = req.user?.id

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để gửi lời mời', ErrorCode.UNAUTHORIED)
        }

        const payload = CreateJobInvitationSchema.parse(req.body)
        const invitation = await jobInvitationService.createJobInvitation(userId, payload)

        return res.status(StatusCodes.CREATED).json(invitation)
}

export const listJobInvitations = async (req: Request, res: Response) => {
        const userId = req.user?.id

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem lời mời', ErrorCode.UNAUTHORIED)
        }

        const filters = JobInvitationFilterSchema.parse(req.query)
        const result = await jobInvitationService.listJobInvitations(userId, filters)

        return res.status(StatusCodes.OK).json(result)
}

export const getJobInvitationDetail = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { invitationId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem lời mời', ErrorCode.UNAUTHORIED)
        }

        if (!invitationId) {
                throw new BadRequestException('Thiếu tham số invitationId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const invitation = await jobInvitationService.getJobInvitationDetail(invitationId, userId)

        return res.status(StatusCodes.OK).json(invitation)
}

export const deleteJobInvitation = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { invitationId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xóa lời mời', ErrorCode.UNAUTHORIED)
        }

        if (!invitationId) {
                throw new BadRequestException('Thiếu tham số invitationId', ErrorCode.PARAM_QUERY_ERROR)
        }

        await jobInvitationService.deleteJobInvitation(invitationId, userId)

        return res.status(StatusCodes.NO_CONTENT).send()
}
