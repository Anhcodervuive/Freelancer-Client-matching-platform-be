import { prismaClient } from '~/config/prisma-client'
import { ChatRealtimeEvent, chatEventEmitter, type ChatThreadSummary } from '~/realtime/chat/chat.events'
import assetService from '~/services/asset.service'

const chatThreadSummarySelect = {
	id: true,
	type: true,
	subject: true,
	jobPostId: true,
	contractId: true,
	participants: {
		select: {
			id: true,
			userId: true,
			role: true,
			user: {
				select: {
					profile: {
						select: {
							firstName: true,
							lastName: true
						}
					}
				}
			}
		}
	}
} as const

const mapThreadToSummary = async (thread: any): Promise<ChatThreadSummary> => {
	const participants = await Promise.all(
		(thread.participants ?? []).map(async (participant: any) => ({
			id: participant.id,
			userId: participant.userId,
			role: participant.role,
			profile: {
				firstName: participant.user.profile?.firstName ?? null,
				lastName: participant.user.profile?.lastName ?? null
			},
			avatar: (await assetService.getProfileAvatarUrl(participant.userId)) ?? null
		}))
	)

	return {
		id: thread.id,
		type: thread.type,
		subject: thread.subject ?? null,
		jobPostId: thread.jobPostId ?? null,
		contractId: thread.contractId ?? null,
		participants
	}
}

interface EnsureProjectThreadParams {
	jobPostId: string
	proposalId: string
	clientId: string
	freelancerId: string
	jobTitle?: string | null
	contractId?: string | null
}

const ensureProjectThreadForProposal = async ({
	jobPostId,
	proposalId,
	clientId,
	freelancerId,
	jobTitle,
	contractId
}: EnsureProjectThreadParams): Promise<ChatThreadSummary> => {
	const prisma = prismaClient as any

	const existing = await prisma.chatThread.findFirst({
		where: {
			type: 'PROJECT',
			OR: [
				{
					metadata: {
						equals: proposalId
					}
				},
				{
					jobPostId,
					participants: {
						some: {
							userId: clientId
						}
					},
					AND: [
						{
							participants: {
								some: {
									userId: freelancerId
								}
							}
						}
					]
				}
			]
		},
		select: chatThreadSummarySelect
	})

	if (existing) {
		return await mapThreadToSummary(existing)
	}

	const created = await prisma.chatThread.create({
		data: {
			type: 'PROJECT',
			jobPostId,
			contractId: contractId ?? undefined,
			subject: jobTitle ?? null,
			metadata: {
				proposalId
			},
			participants: {
				create: [
					{
						userId: clientId,
						role: 'CLIENT'
					},
					{
						userId: freelancerId,
						role: 'FREELANCER'
					}
				]
			}
		},
		select: chatThreadSummarySelect
	})

	const summary = await mapThreadToSummary(created)

	chatEventEmitter.emit(ChatRealtimeEvent.THREAD_CREATED, { thread: summary })

	return summary
}

const chatThreadService = {
	ensureProjectThreadForProposal
}

export default chatThreadService
