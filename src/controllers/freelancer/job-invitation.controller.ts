import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import {
        JobInvitationFilterSchema,
        RespondJobInvitationSchema
} from '~/schema/job-invitation.schema'
import freelancerJobInvitationService from '~/services/freelancer/job-invitation.service'

export const listJobInvitations = async (req: Request, res: Response) => {
        const userId = req.user?.id

        if (!userId) {
                throw new UnauthorizedException(
                        'Bạn cần đăng nhập để xem lời mời',
                        ErrorCode.UNAUTHORIED
                )
        }

        const filters = JobInvitationFilterSchema.parse(req.query)
        const invitations = await freelancerJobInvitationService.listJobInvitations(userId, filters)

        return res.status(StatusCodes.OK).json(invitations)
}

export const getJobInvitationDetail = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { invitationId } = req.params

        if (!userId) {
                throw new UnauthorizedException(
                        'Bạn cần đăng nhập để xem lời mời',
                        ErrorCode.UNAUTHORIED
                )
        }

        if (!invitationId) {
                throw new BadRequestException('Thiếu tham số invitationId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const invitation = await freelancerJobInvitationService.getJobInvitationDetail(userId, invitationId)

        return res.status(StatusCodes.OK).json(invitation)
}

export const respondToJobInvitation = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { invitationId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để phản hồi lời mời', ErrorCode.UNAUTHORIED)
        }

        if (!invitationId) {
                throw new BadRequestException('Thiếu tham số invitationId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const payload = RespondJobInvitationSchema.parse(req.body)
        const invitation = await freelancerJobInvitationService.respondToJobInvitation(userId, invitationId, payload)

        return res.status(StatusCodes.OK).json(invitation)
}
