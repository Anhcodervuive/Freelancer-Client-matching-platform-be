import { Prisma } from '~/generated/prisma'

const jobProposalInclude = Prisma.validator<Prisma.JobProposalInclude>()({
        job: {
                select: {
                        id: true,
                        title: true,
                        status: true,
                        budgetAmount: true,
                        budgetCurrency: true,
                        clientId: true,
                        client: {
                                select: {
                                        userId: true,
                                        companyName: true,
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
        invitation: {
                select: {
                        id: true,
                        status: true,
                        sentAt: true
                }
        }
})

type JobProposalPayload = Prisma.JobProposalGetPayload<{ include: typeof jobProposalInclude }>

type FreelancerProfile = JobProposalPayload['freelancer']['profile']
type ClientProfile = NonNullable<JobProposalPayload['job']['client']>['profile']

const buildDisplayName = (
        profile: FreelancerProfile | ClientProfile | null
): string | null => {
        if (!profile) return null
        const firstName = profile.firstName ?? ''
        const lastNameInitial = profile.lastName ? `${profile.lastName[0]}.` : ''
        const combined = `${firstName} ${lastNameInitial}`.trim()
        return combined.length > 0 ? combined : null
}

const serializeFreelancerSummary = (freelancer: JobProposalPayload['freelancer']) => {
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

const serializeClientSummary = (client: JobProposalPayload['job']['client']) => {
        if (!client) return null
        const profile = client.profile
        return {
                id: client.userId,
                companyName: client.companyName ?? null,
                profile: {
                        firstName: profile?.firstName ?? null,
                        lastName: profile?.lastName ?? null,
                        displayName: buildDisplayName(profile),
                        location: {
                                country: profile?.country ?? null,
                                city: profile?.city ?? null
                        }
                }
        }
}

const serializeJobSummary = (proposal: JobProposalPayload) => {
        const job = proposal.job
        return {
                id: job.id,
                title: job.title,
                status: job.status,
                budgetAmount: job.budgetAmount ? Number(job.budgetAmount) : null,
                budgetCurrency: job.budgetCurrency ?? null,
                client: serializeClientSummary(job.client)
        }
}

const serializeJobProposal = (proposal: JobProposalPayload) => {
        return {
                id: proposal.id,
                job: serializeJobSummary(proposal),
                freelancer: serializeFreelancerSummary(proposal.freelancer),
                invitation: proposal.invitation
                        ? {
                                  id: proposal.invitation.id,
                                  status: proposal.invitation.status,
                                  sentAt: proposal.invitation.sentAt
                          }
                        : null,
                coverLetter: proposal.coverLetter ?? null,
                bidAmount: proposal.bidAmount ? Number(proposal.bidAmount) : null,
                bidCurrency: proposal.bidCurrency ?? null,
                estimatedDuration: proposal.estimatedDuration ?? null,
                status: proposal.status,
                submittedAt: proposal.submittedAt,
                withdrawnAt: proposal.withdrawnAt ?? null,
                createdAt: proposal.createdAt,
                updatedAt: proposal.updatedAt
        }
}

export {
        jobProposalInclude,
        serializeJobProposal,
        serializeFreelancerSummary,
        serializeJobSummary,
        type JobProposalPayload
}
