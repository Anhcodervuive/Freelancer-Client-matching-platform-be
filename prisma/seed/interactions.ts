import {
	ChatMessageType,
	ChatThreadType,
	JobOfferStatus,
	JobOfferType,
	JobProposalStatus,
	MatchInteractionSource,
	MatchInteractionType,
	Prisma,
	Role
} from '../../src/generated/prisma'
import { prisma, runStep } from './_utils'

export async function seedInteractions() {
	await runStep('Seed match interactions from search to hire', async () => {
		const freelancer = await prisma.user.findUnique({
			where: { email: 'amira.nguyen@freelancer.test' },
			select: { id: true, role: true }
		})

		const client = await prisma.user.findUnique({
			where: { email: 'linh.tran@client.test' },
			select: { id: true, role: true }
		})

		const job = await prisma.jobPost.findFirst({
			where: {
				title: 'Customer success portal with SLA timers',
				isDeleted: false
			},
			select: { id: true, clientId: true, title: true }
		})

		if (!freelancer || freelancer.role !== Role.FREELANCER) {
			console.warn('⚠ Cannot seed interactions: freelancer amira.nguyen@freelancer.test not found or role mismatch')
			return
		}

		if (!client || client.role !== Role.CLIENT) {
			console.warn('⚠ Cannot seed interactions: client linh.tran@client.test not found or role mismatch')
			return
		}

		if (!job) {
			console.warn('⚠ Cannot seed interactions: job "Customer success portal with SLA timers" not found')
			return
		}

		if (job.clientId !== client.id) {
			console.warn('⚠ Cannot seed interactions: job is not owned by the expected client linh.tran@client.test')
			return
		}

		// Clean old timeline to keep idempotent
		await prisma.matchInteraction.deleteMany({
			where: { jobId: job.id, freelancerId: freelancer.id, clientId: client.id }
		})

		const proposal = await prisma.jobProposal.upsert({
			where: {
				jobId_freelancerId: {
					jobId: job.id,
					freelancerId: freelancer.id
				}
			},
			update: {
				coverLetter:
					'Hi Linh, I would deliver the SLA portal with auditable event logs, RBAC, and BullMQ timers that align with your incident workflows.',
				bidAmount: new Prisma.Decimal(17000),
				bidCurrency: 'USD',
				estimatedDuration: null,
				status: JobProposalStatus.HIRED
			},
			create: {
				jobId: job.id,
				freelancerId: freelancer.id,
				coverLetter:
					'Hi Linh, I would deliver the SLA portal with auditable event logs, RBAC, and BullMQ timers that align with your incident workflows.',
				bidAmount: new Prisma.Decimal(17000),
				bidCurrency: 'USD',
				estimatedDuration: null,
				status: JobProposalStatus.HIRED,
				submittedAt: new Date('2024-05-20T08:30:00.000Z')
			}
		})

		const existingOffer = await prisma.jobOffer.findFirst({
			where: { jobId: job.id, freelancerId: freelancer.id, isDeleted: false }
		})

                const offer = existingOffer
                        ? await prisma.jobOffer.update({
                                  where: { id: existingOffer.id },
                                  data: {
                                          proposalId: proposal.id,
                                          status: JobOfferStatus.ACCEPTED,
                                          sentAt: new Date('2024-05-22T15:00:00.000Z'),
                                          respondedAt: new Date('2024-05-23T02:00:00.000Z'),
                                          expireAt: new Date('2099-12-31T00:00:00.000Z'),
                                          isDeleted: false
                                  }
                          })
                        : await prisma.jobOffer.create({
                                  data: {
                                          jobId: job.id,
                                          clientId: client.id,
                                          freelancerId: freelancer.id,
                                          proposalId: proposal.id,
                                          title: 'Offer: Customer success portal with SLA timers',
                                          message:
                                                  'We would like to proceed with you as our partner for the SLA portal. Please accept this fixed-price offer to kick off.',
                                          type: JobOfferType.FIXED_PRICE,
                                          currency: 'USD',
                                          fixedPrice: new Prisma.Decimal(17000),
                                          startDate: new Date('2024-05-27T00:00:00.000Z'),
                                          endDate: new Date('2024-08-27T00:00:00.000Z'),
                                          expireAt: new Date('2099-12-31T00:00:00.000Z'),
                                          status: JobOfferStatus.ACCEPTED,
                                          sentAt: new Date('2024-05-22T15:00:00.000Z'),
                                          respondedAt: new Date('2024-05-23T02:00:00.000Z'),
                                          isDeleted: false
                                  }
                          })

		// Refresh the project chat to mirror the interview and negotiation
		await prisma.chatThread.deleteMany({
			where: {
				type: ChatThreadType.PROJECT,
				jobPostId: job.id,
				AND: [
					{ participants: { some: { userId: client.id } } },
					{ participants: { some: { userId: freelancer.id } } }
				]
			}
		})

		const thread = await prisma.chatThread.create({
			data: {
				type: ChatThreadType.PROJECT,
				jobPostId: job.id,
				subject: job.title,
				metadata: { proposalId: proposal.id },
				participants: {
					create: [
						{
							userId: client.id,
							role: Role.CLIENT,
							joinedAt: new Date('2024-05-20T09:10:00.000Z')
						},
						{
							userId: freelancer.id,
							role: Role.FREELANCER,
							joinedAt: new Date('2024-05-20T09:12:00.000Z')
						}
					]
				}
			},
			select: {
				id: true,
				participants: { select: { id: true, userId: true } }
			}
		})

		const messages = [
			{
				senderId: freelancer.id,
				senderRole: Role.FREELANCER,
				sentAt: new Date('2024-05-20T08:35:00.000Z'),
				body:
					'I dug into your spec and can map SLA timers to a BullMQ pipeline with audit logs. Happy to walk through the approach if helpful.',
				metadata: { proposalId: proposal.id }
			},
			{
				senderId: client.id,
				senderRole: Role.CLIENT,
				sentAt: new Date('2024-05-21T09:05:00.000Z'),
				body:
					"Thanks Amira. Let's do a 45-min video interview to review the incident workflows and see a quick demo of your monitoring setup.",
				metadata: { interview: { format: 'video', durationMinutes: 45 } }
			},
			{
				senderId: freelancer.id,
				senderRole: Role.FREELANCER,
				sentAt: new Date('2024-05-21T12:00:00.000Z'),
				body:
					"Confirmed for 4:30 PM. I'll show the SLA breach ladder, alert fanout, and how we persist customer comms to the portal.",
				metadata: { interviewConfirmed: true }
			},
			{
				senderId: client.id,
				senderRole: Role.CLIENT,
				sentAt: new Date('2024-05-21T16:55:00.000Z'),
				body:
					'Solid walkthrough—please share the ERD and any dashboard screenshots so my ops lead can review.',
				metadata: { followUp: true }
			},
			{
				senderId: freelancer.id,
				senderRole: Role.FREELANCER,
				sentAt: new Date('2024-05-21T18:10:00.000Z'),
				body:
					"Attached ERD + Grafana panel links. I also noted a phased rollout so we can validate SLIs before hardening the automation.",
				metadata: { attachments: ['erd.pdf', 'grafana.png'] }
			},
			{
				senderId: client.id,
				senderRole: Role.CLIENT,
				sentAt: new Date('2024-05-22T14:45:00.000Z'),
				body:
					"We're good to move forward—sending the fixed-price offer now. Once you accept, let's kick off with the runbook mapping.",
				metadata: { offerId: offer.id }
			}
		]

		const createdMessages = [] as { id: string }[]

		for (const message of messages) {
			const created = await prisma.chatMessage.create({
				data: {
					threadId: thread.id,
					type: ChatMessageType.USER,
					...message
				}
			})
			createdMessages.push({ id: created.id })
		}

		const lastMessageId = createdMessages[createdMessages.length - 1]?.id

		if (lastMessageId) {
			for (const participant of thread.participants) {
				await prisma.chatParticipant.update({
					where: { id: participant.id },
					data: {
						lastReadMessageId: lastMessageId,
						lastReadAt: new Date('2024-05-23T02:10:00.000Z')
					}
				})
			}
		}

		const timeline = [
			{
				type: MatchInteractionType.JOB_VIEW,
				source: MatchInteractionSource.SEARCH,
				occurredAt: new Date('2024-05-18T07:00:00.000Z'),
				metadata: { query: 'fullstack SLA portal', resultRank: 3 },
				actorRole: Role.FREELANCER,
				actorProfileId: freelancer.id
			},
			{
				type: MatchInteractionType.PROFILE_VIEW,
				source: MatchInteractionSource.DIRECT,
				occurredAt: new Date('2024-05-19T01:10:00.000Z'),
				metadata: { jobTitle: job.title },
				actorRole: Role.CLIENT,
				actorProfileId: client.id
			},
			{
				type: MatchInteractionType.PROPOSAL_SUBMITTED,
				source: MatchInteractionSource.DIRECT,
				occurredAt: new Date('2024-05-20T08:30:00.000Z'),
				metadata: { bid: { amount: 17000, currency: 'USD' } },
				actorRole: Role.FREELANCER,
				actorProfileId: freelancer.id
			},
			{
				type: MatchInteractionType.PROPOSAL_SHORTLISTED,
				source: MatchInteractionSource.DIRECT,
				occurredAt: new Date('2024-05-21T09:00:00.000Z'),
				metadata: { note: 'Strong alignment with SLA timers and observability' },
				actorRole: Role.CLIENT,
				actorProfileId: client.id
			},
			{
				type: MatchInteractionType.PROPOSAL_INTERVIEWING,
				source: MatchInteractionSource.DIRECT,
				occurredAt: new Date('2024-05-21T16:30:00.000Z'),
				metadata: { interview: { format: 'video', durationMinutes: 45 } },
				actorRole: Role.CLIENT,
				actorProfileId: client.id
			},
			{
				type: MatchInteractionType.OFFER_SENT,
				source: MatchInteractionSource.DIRECT,
				occurredAt: new Date('2024-05-22T15:00:00.000Z'),
				metadata: { offerId: offer.id },
				actorRole: Role.CLIENT,
				actorProfileId: client.id
			},
			{
				type: MatchInteractionType.OFFER_ACCEPTED,
				source: MatchInteractionSource.DIRECT,
				occurredAt: new Date('2024-05-23T02:00:00.000Z'),
				metadata: { offerId: offer.id },
				actorRole: Role.FREELANCER,
				actorProfileId: freelancer.id
			},
			{
				type: MatchInteractionType.PROPOSAL_HIRED,
				source: MatchInteractionSource.DIRECT,
				occurredAt: new Date('2024-05-23T02:05:00.000Z'),
				metadata: { contractStart: '2024-05-27' },
				actorRole: Role.CLIENT,
				actorProfileId: client.id
			}
		]

		await prisma.matchInteraction.createMany({
			data: timeline.map(item => ({
				jobId: job.id,
				freelancerId: freelancer.id,
				clientId: client.id,
				proposalId: proposal.id,
				actorProfileId: item.actorProfileId,
				actorRole: item.actorRole,
				type: item.type,
				source: item.source,
				occurredAt: item.occurredAt,
				metadata: item.metadata
			}))
		})
	})
}
