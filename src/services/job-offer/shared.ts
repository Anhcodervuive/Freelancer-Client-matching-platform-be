import { Prisma } from '~/generated/prisma'

const jobOfferInclude = Prisma.validator<Prisma.JobOfferInclude>()({
        job: {
                select: {
                        id: true,
                        title: true,
                        status: true
                }
        },
        client: {
                select: {
                        userId: true,
                        companyName: true,
                        profile: {
                                select: {
                                        firstName: true,
                                        lastName: true
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
        proposal: {
                select: {
                        id: true,
                        status: true
                }
        },
        invitation: {
                select: {
                        id: true,
                        status: true
                }
        }
})

const jobOfferSummaryInclude = Prisma.validator<Prisma.JobOfferInclude>()({
        job: {
                select: {
                        id: true,
                        title: true,
                        status: true
                }
        },
        client: {
                select: {
                        userId: true,
                        companyName: true,
                        profile: {
                                select: {
                                        firstName: true,
                                        lastName: true
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
        proposal: {
                select: {
                        id: true,
                        status: true
                }
        },
        invitation: {
                select: {
                        id: true,
                        status: true
                }
        }
})

type JobOfferPayload = Prisma.JobOfferGetPayload<{ include: typeof jobOfferInclude }>
type JobOfferSummaryPayload = Prisma.JobOfferGetPayload<{ include: typeof jobOfferSummaryInclude }>

const buildDisplayName = (
        profile:
                | JobOfferPayload['freelancer']['profile']
                | JobOfferSummaryPayload['freelancer']['profile']
) => {
        if (!profile) return null
        const firstName = profile.firstName ?? ''
        const lastNameInitial = profile.lastName ? `${profile.lastName[0]}.` : ''
        const combined = `${firstName} ${lastNameInitial}`.trim()
        return combined.length > 0 ? combined : null
}

const serializeFreelancerSummary = (
        freelancer: JobOfferPayload['freelancer'] | JobOfferSummaryPayload['freelancer']
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

const AUTO_WITHDRAW_REASON_HIRED = 'Đã chọn được freelancer khác cho công việc này'

const serializeJobOffer = (offer: JobOfferPayload | JobOfferSummaryPayload) => {
        return {
                id: offer.id,
                job: offer.job
                        ? {
                                  id: offer.job.id,
                                  title: offer.job.title,
                                  status: offer.job.status
                          }
                        : null,
                client: offer.client
                        ? {
                                  id: offer.client.userId,
                                  companyName: offer.client.companyName ?? null,
                                  profile: {
                                          firstName: offer.client.profile?.firstName ?? null,
                                          lastName: offer.client.profile?.lastName ?? null
                                  }
                          }
                        : null,
                freelancer: serializeFreelancerSummary(offer.freelancer),
                proposal: offer.proposal
                        ? {
                                  id: offer.proposal.id,
                                  status: offer.proposal.status
                          }
                        : null,
                invitation: offer.invitation
                        ? {
                                  id: offer.invitation.id,
                                  status: offer.invitation.status
                          }
                        : null,
                title: offer.title,
                message: offer.message ?? null,
                currency: offer.currency,
                fixedPrice: offer.fixedPrice ? Number(offer.fixedPrice) : null,
                type: offer.type,
                startDate: offer.startDate ?? null,
                endDate: offer.endDate ?? null,
                expireAt: offer.expireAt ?? null,
                status: offer.status,
                sentAt: offer.sentAt ?? null,
                respondedAt: offer.respondedAt ?? null,
                withdrawReason: offer.withdrawReason ?? null,
                createdAt: offer.createdAt,
                updatedAt: offer.updatedAt
        }
}

type SerializedJobOffer = ReturnType<typeof serializeJobOffer>

export {
        jobOfferInclude,
        jobOfferSummaryInclude,
        serializeJobOffer,
        type JobOfferPayload,
        type JobOfferSummaryPayload,
        type SerializedJobOffer,
        AUTO_WITHDRAW_REASON_HIRED
}
