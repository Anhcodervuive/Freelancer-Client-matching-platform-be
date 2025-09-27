import { JobInvitationStatus, NotificationCategory, NotificationEvent, NotificationResource } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { RespondJobInvitationInput } from '~/schema/job-invitation.schema'
import { jobInvitationInclude, serializeJobInvitation } from '~/services/job-invitation/shared'
import notificationService from '~/services/notification.service'

const ensureFreelancerUser = async (userId: string) => {
        const freelancer = await prismaClient.freelancer.findUnique({
                where: { userId },
                select: { userId: true }
        })

        if (!freelancer) {
                throw new UnauthorizedException('Chỉ freelancer mới có thể phản hồi lời mời', ErrorCode.USER_NOT_AUTHORITY)
        }

        return freelancer
}

const respondToJobInvitation = async (
        freelancerUserId: string,
        invitationId: string,
        payload: RespondJobInvitationInput
) => {
        await ensureFreelancerUser(freelancerUserId)

        const invitation = await prismaClient.jobInvitation.findFirst({
                where: {
                        id: invitationId,
                        freelancerId: freelancerUserId
                },
                include: jobInvitationInclude
        })

        if (!invitation) {
                throw new NotFoundException('Lời mời không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        if (invitation.status === JobInvitationStatus.ACCEPTED || invitation.status === JobInvitationStatus.DECLINED) {
                throw new BadRequestException('Bạn đã phản hồi lời mời này rồi', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (invitation.status === JobInvitationStatus.EXPIRED) {
                throw new BadRequestException('Lời mời đã hết hạn', ErrorCode.PARAM_QUERY_ERROR)
        }

        const now = new Date()

        if (invitation.expiresAt && invitation.expiresAt.getTime() <= now.getTime()) {
                await prismaClient.jobInvitation.update({
                        where: { id: invitation.id },
                        data: { status: JobInvitationStatus.EXPIRED }
                })

                throw new BadRequestException('Lời mời đã hết hạn', ErrorCode.PARAM_QUERY_ERROR)
        }

        const status =
                payload.action === 'accept' ? JobInvitationStatus.ACCEPTED : JobInvitationStatus.DECLINED

        const updatedInvitation = await prismaClient.jobInvitation.update({
                where: { id: invitation.id },
                data: {
                        status,
                        respondedAt: now
                },
                include: jobInvitationInclude
        })

        const serialized = serializeJobInvitation(updatedInvitation)

        try {
                await notificationService.create({
                        recipientId: invitation.clientId,
                        actorId: freelancerUserId,
                        category: NotificationCategory.JOB,
                        event:
                                status === JobInvitationStatus.ACCEPTED
                                        ? NotificationEvent.JOB_INVITATION_ACCEPTED
                                        : NotificationEvent.JOB_INVITATION_DECLINED,
                        resourceType: NotificationResource.JOB_INVITATION,
                        resourceId: invitation.id,
                        payload: {
                                invitationId: invitation.id,
                                jobId: invitation.jobId,
                                status
                        }
                })
        } catch (notificationError) {
                // eslint-disable-next-line no-console
                console.error('Failed to create notification for job invitation response', notificationError)
        }

        return {
                ...serialized,
                client: updatedInvitation.client
                        ? {
                                  id: updatedInvitation.client.userId,
                                  profile: {
                                          firstName: updatedInvitation.client.profile?.firstName ?? null,
                                          lastName: updatedInvitation.client.profile?.lastName ?? null
                                  }
                          }
                        : null
        }
}

const freelancerJobInvitationService = {
        respondToJobInvitation
}

export default freelancerJobInvitationService
