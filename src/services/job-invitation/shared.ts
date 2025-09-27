import { Prisma } from '~/generated/prisma'

const jobInvitationInclude = Prisma.validator<Prisma.JobInvitationInclude>()({
        job: {
                select: {
                        id: true,
                        title: true,
                        status: true
                }
        },
        freelancer: {
                select: {
                        userId: true,
                        title: true,
                        profile: {
                                select: {
                                        firstName: true,
                                        lastName: true,
                                        country: true,
                                        city: true
                                }
                        }
                }
        },
        client: {
                select: {
                        userId: true,
                        profile: {
                                select: {
                                        firstName: true,
                                        lastName: true
                                }
                        }
                }
        }
})

const jobInvitationSummaryInclude = Prisma.validator<Prisma.JobInvitationInclude>()({
        job: {
                select: {
                        id: true,
                        title: true,
                        status: true
                }
        },
        freelancer: {
                select: {
                        userId: true,
                        title: true,
                        profile: {
                                select: {
                                        firstName: true,
                                        lastName: true,
                                        country: true,
                                        city: true
                                }
                        }
                }
        }
})

type JobInvitationPayload = Prisma.JobInvitationGetPayload<{ include: typeof jobInvitationInclude }>
type JobInvitationSummaryPayload = Prisma.JobInvitationGetPayload<{ include: typeof jobInvitationSummaryInclude }>

const buildDisplayName = (
        profile: JobInvitationPayload['freelancer']['profile'] | JobInvitationSummaryPayload['freelancer']['profile']
) => {
        if (!profile) return null
        const firstName = profile.firstName ?? ''
        const lastNameInitial = profile.lastName ? `${profile.lastName[0]}.` : ''
        const combined = `${firstName} ${lastNameInitial}`.trim()
        return combined.length > 0 ? combined : null
}

const serializeFreelancerSummary = (
        freelancer: JobInvitationPayload['freelancer'] | JobInvitationSummaryPayload['freelancer']
) => {
        return {
                id: freelancer.userId,
                title: freelancer.title ?? null,
                profile: {
                        firstName: freelancer.profile?.firstName ?? null,
                        lastName: freelancer.profile?.lastName ?? null,
                        displayName: buildDisplayName(freelancer.profile),
                        location: {
                                country: freelancer.profile?.country ?? null,
                                city: freelancer.profile?.city ?? null
                        }
                }
        }
}

const serializeJobInvitation = (invitation: JobInvitationPayload | JobInvitationSummaryPayload) => {
        return {
                id: invitation.id,
                job: {
                        id: invitation.job.id,
                        title: invitation.job.title,
                        status: invitation.job.status
                },
                freelancer: serializeFreelancerSummary(invitation.freelancer),
                message: invitation.message ?? null,
                status: invitation.status,
                sentAt: invitation.sentAt,
                respondedAt: invitation.respondedAt ?? null,
                expiresAt: invitation.expiresAt ?? null,
                createdAt: invitation.createdAt,
                updatedAt: invitation.updatedAt
        }
}

export {
        jobInvitationInclude,
        jobInvitationSummaryInclude,
        serializeJobInvitation,
        type JobInvitationPayload,
        type JobInvitationSummaryPayload
}
