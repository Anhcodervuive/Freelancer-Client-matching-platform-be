import { Prisma } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { ChatMessageListQuerySchema, ChatThreadListQuerySchema, MarkThreadReadSchema } from '~/schema/chat.schema'
import { ErrorCode } from '~/exceptions/root'
import { NotFoundException } from '~/exceptions/not-found'
import { ForbiddenException } from '~/exceptions/Forbidden'
import { BadRequestException } from '~/exceptions/bad-request'

const chatService = {
	async listThreads(userId: string, rawQuery: unknown) {
		const parsed = ChatThreadListQuerySchema.parse(rawQuery)

		const {
			page,
			limit,
			type,
			jobPostId,
			contractId,
			search,
			participantRole,
			includeParticipants,
			includeLastMessage
		} = parsed

		const skip = (page - 1) * limit

		const participantFilter: Prisma.ChatParticipantWhereInput = {
			userId
		}

		if (participantRole) {
			participantFilter.role = participantRole
		}

		const where: Prisma.ChatThreadWhereInput = {
			participants: {
				some: participantFilter
			}
		}

		if (type) {
			where.type = type
		}

		if (jobPostId) {
			where.jobPostId = jobPostId
		}

		if (contractId) {
			where.contractId = contractId
		}

		if (search) {
			where.OR = [
				{
					subject: {
						contains: search
					}
				},
				{
					jobPost: {
						title: {
							contains: search
						}
					}
				},
				{
					contract: {
						title: {
							contains: search
						}
					}
				}
			]
		}

		const resolvedIncludeParticipants = includeParticipants ?? true
		const resolvedIncludeLastMessage = includeLastMessage ?? true

		const threadInclude = {
			jobPost: {
				select: {
					id: true,
					title: true,
					status: true,
					clientId: true,
					specialtyId: true,
					createdAt: true
				}
			},
			contract: {
				select: {
					id: true,
					title: true,
					clientId: true,
					freelancerId: true,
					jobPostId: true,
					createdAt: true
				}
			},
			_count: {
				select: {
					messages: true
				}
			},
			...(resolvedIncludeParticipants
				? {
						participants: {
							include: {
								user: {
									select: {
										id: true,
										email: true,
										profile: true
									}
								}
							},
							orderBy: {
								joinedAt: Prisma.SortOrder.asc
							}
						}
				  }
				: {}),
			...(resolvedIncludeLastMessage
				? {
						messages: {
							orderBy: {
								sentAt: Prisma.SortOrder.desc
							},
							take: 1,
							include: {
								sender: {
									select: {
										id: true,
										email: true,
										profile: true
									}
								},
								attachments: true
							}
						}
				  }
				: {})
		}

		const [threads, total] = await Promise.all([
			prismaClient.chatThread.findMany({
				where,
				orderBy: {
					updatedAt: Prisma.SortOrder.desc
				},
				skip,
				take: limit,
				include: threadInclude
			}),
			prismaClient.chatThread.count({ where })
		])

		return {
			page,
			limit,
			total,
			hasMore: skip + threads.length < total,
			data: threads
		}
	},

	async getThreadById(userId: string, threadId: string) {
		const thread = await prismaClient.chatThread.findUnique({
			where: { id: threadId },
			include: {
				jobPost: {
					select: {
						id: true,
						title: true,
						status: true,
						clientId: true,
						specialtyId: true,
						createdAt: true
					}
				},
				contract: {
					select: {
						id: true,
						title: true,
						clientId: true,
						freelancerId: true,
						jobPostId: true,
						createdAt: true
					}
				},
				_count: {
					select: {
						messages: true
					}
				},
				participants: {
					include: {
						user: {
							select: {
								id: true,
								email: true,
								profile: true
							}
						}
					},
					orderBy: {
						joinedAt: Prisma.SortOrder.asc
					}
				},
				messages: {
					orderBy: {
						sentAt: Prisma.SortOrder.desc
					},
					take: 1,
					include: {
						sender: {
							select: {
								id: true,
								email: true,
								profile: true
							}
						},
						attachments: true
					}
				}
			}
		})

		if (!thread) {
			throw new NotFoundException('Chat thread not found', ErrorCode.ITEM_NOT_FOUND)
		}

		const isParticipant = thread.participants?.some(participant => participant.userId === userId)

		if (!isParticipant) {
			throw new ForbiddenException('You are not a participant of this chat thread', ErrorCode.FORBIDDEN)
		}

		return thread
	},

	async getThreadMessages(userId: string, threadId: string, rawQuery: unknown) {
		const parsed = ChatMessageListQuerySchema.parse(rawQuery)

		const thread = await prismaClient.chatThread.findUnique({
			where: { id: threadId },
			select: { id: true }
		})

		if (!thread) {
			throw new NotFoundException('Chat thread not found', ErrorCode.ITEM_NOT_FOUND)
		}

		const participant = await prismaClient.chatParticipant.findFirst({
			where: {
				threadId,
				userId
			}
		})

		if (!participant) {
			throw new ForbiddenException('You are not a participant of this chat thread', ErrorCode.FORBIDDEN)
		}

		const { limit, cursor, direction, includeReceipts, includeAttachments } = parsed

		const orderDirection: Prisma.SortOrder = direction === 'after' ? Prisma.SortOrder.asc : Prisma.SortOrder.desc
		const take = limit + 1

		const messageInclude = {
			sender: {
				select: {
					id: true,
					email: true,
					profile: true
				}
			},
			...(includeAttachments ? { attachments: true } : {}),
			...(includeReceipts
				? {
						receipts: {
							include: {
								participant: {
									include: {
										user: {
											select: {
												id: true,
												email: true,
												profile: true
											}
										}
									}
								}
							}
						}
				  }
				: {})
		}

		const messages = await prismaClient.chatMessage.findMany({
			where: {
				threadId,
				deletedAt: null
			},
			orderBy: [
				{
					sentAt: orderDirection
				},
				{
					id: orderDirection
				}
			],
			take,
			...(cursor
				? {
						cursor: { id: cursor },
						skip: 1
				  }
				: {}),
			include: messageInclude
		})

		const hasMore = messages.length > limit
		const sliced = hasMore ? messages.slice(0, limit) : messages

		const normalized = direction === 'after' ? sliced : [...sliced].reverse()

		const nextCursor = (() => {
			if (normalized.length === 0) return null
			if (direction === 'after') {
				return normalized[normalized.length - 1]?.id ?? null
			}
			return normalized[0]?.id ?? null
		})()

		return {
			data: normalized,
			limit,
			direction,
			hasMore,
			nextCursor
		}
	},

	async markThreadAsRead(userId: string, threadId: string, rawBody: unknown) {
		const parsed = MarkThreadReadSchema.parse(rawBody)

		const thread = await prismaClient.chatThread.findUnique({
			where: { id: threadId },
			select: { id: true }
		})

		if (!thread) {
			throw new NotFoundException('Chat thread not found', ErrorCode.ITEM_NOT_FOUND)
		}

		return prismaClient.$transaction(async tx => {
			const participant = await tx.chatParticipant.findFirst({
				where: {
					threadId,
					userId
				}
			})

			if (!participant) {
				throw new ForbiddenException('You are not a participant of this chat thread', ErrorCode.FORBIDDEN)
			}

			let targetMessageId = parsed.messageId ?? null
			let targetMessageSentAt: Date | null = null

			if (targetMessageId) {
				const message = await tx.chatMessage.findFirst({
					where: {
						id: targetMessageId,
						threadId
					},
					select: {
						id: true,
						sentAt: true
					}
				})

				if (!message) {
					throw new BadRequestException('Message does not belong to this thread', ErrorCode.PARAM_QUERY_ERROR)
				}

				targetMessageSentAt = message.sentAt
			} else {
				const latestMessage = await tx.chatMessage.findFirst({
					where: { threadId },
					orderBy: {
						sentAt: Prisma.SortOrder.desc
					},
					select: {
						id: true,
						sentAt: true
					}
				})

				if (!latestMessage) {
					const updatedParticipant = await tx.chatParticipant.update({
						where: { id: participant.id },
						data: {
							lastReadAt: new Date(),
							lastReadMessageId: null
						}
					})

					return {
						participant: updatedParticipant,
						lastReadMessageId: null,
						updatedReceipts: 0
					}
				}

				targetMessageId = latestMessage.id
				targetMessageSentAt = latestMessage.sentAt
			}

			const now = new Date()

			const updatedParticipant = await tx.chatParticipant.update({
				where: { id: participant.id },
				data: {
					lastReadMessageId: targetMessageId,
					lastReadAt: now
				}
			})

			const updatedReceipts = await tx.chatMessageReceipt.updateMany({
				where: {
					participantId: participant.id,
					readAt: null,
					message: {
						threadId,
						sentAt: {
							lte: targetMessageSentAt ?? now
						}
					}
				},
				data: {
					readAt: now
				}
			})

			return {
				participant: updatedParticipant,
				lastReadMessageId: targetMessageId,
				updatedReceipts: updatedReceipts.count
			}
		})
	}
}

export default chatService
