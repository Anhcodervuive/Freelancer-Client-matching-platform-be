import type { ChatMessage, ChatMessageType, Role } from '~/generated/prisma'
import type { RemoteSocket, Server, Socket } from 'socket.io'

import { prismaClient } from '~/config/prisma-client'
import { redisClient } from '~/config/redis-client'

import {
        ChatRealtimeEvent,
        chatEventEmitter,
        type ChatRealtimeEventPayloads,
        type ChatThreadSummary
} from './chat.events'
import { authenticateSocket } from '../common/auth.middleware'

type Acknowledgement = (response: { success: boolean; message?: string; data?: unknown }) => void

interface JoinThreadPayload {
	threadId: string
}

interface SendMessagePayload {
	threadId: string
	body: string
	tempId?: string
	type?: ChatMessageType
	metadata?: Record<string, unknown>
}

interface TypingPayload {
	threadId: string
	isTyping: boolean
}

interface ReadReceiptPayload {
	threadId: string
	messageId: string
}

const THREAD_ROOM = (threadId: string) => `chat:thread:${threadId}`
const THREAD_META_CACHE_KEY = (threadId: string) => `chat:thread:${threadId}:meta`
const PRESENCE_KEY = (userId: string) => `chat:presence:${userId}`
const PRESENCE_COUNT_KEY = (userId: string) => `chat:presence:${userId}:count`
const TYPING_KEY = (threadId: string, userId: string) => `chat:typing:${threadId}:${userId}`
const OFFLINE_QUEUE_KEY = (userId: string) => `chat:offline:${userId}`
const RATE_LIMIT_KEY = (userId: string, windowSeconds: number) =>
	`chat:rate:${userId}:${Math.floor(Date.now() / (windowSeconds * 1000))}`
const ANALYTICS_STREAM_KEY = 'chat:logs:events'

const THREAD_META_TTL_SECONDS = 60 * 5
const TYPING_TTL_SECONDS = 6
const PRESENCE_TTL_SECONDS = 120
const OFFLINE_QUEUE_MAX_LENGTH = 200
const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX_MESSAGES = 25

const respond = (ack?: Acknowledgement, response?: Parameters<Acknowledgement>[0]) => {
	if (typeof ack === 'function') {
		ack(response ?? { success: true })
	}
}

const ensureRateLimit = async (userId: string) => {
	const key = RATE_LIMIT_KEY(userId, RATE_LIMIT_WINDOW_SECONDS)
	const current = await redisClient.incr(key)
	if (current === 1) {
		await redisClient.expire(key, RATE_LIMIT_WINDOW_SECONDS)
	}
	if (current > RATE_LIMIT_MAX_MESSAGES) {
		throw new Error('Bạn đang gửi tin nhắn quá nhanh, vui lòng thử lại sau.')
	}
}

const markUserOnline = async (userId: string) => {
	const pipeline = redisClient.multi()
	pipeline.incr(PRESENCE_COUNT_KEY(userId))
	pipeline.set(PRESENCE_KEY(userId), 'online', 'EX', PRESENCE_TTL_SECONDS)
	await pipeline.exec()
}

const markUserOffline = async (userId: string): Promise<boolean> => {
	const remaining = await redisClient.decr(PRESENCE_COUNT_KEY(userId))

	if (remaining <= 0) {
		const pipeline = redisClient.multi()
		pipeline.del(PRESENCE_COUNT_KEY(userId))
		pipeline.del(PRESENCE_KEY(userId))
		await pipeline.exec()
		return false
	}

	return true
}

const isUserOnline = async (userId: string) => {
        const result = await redisClient.exists(PRESENCE_KEY(userId))
        return result === 1
}

const getUsersPresence = async (userIds: string[]) => {
        if (userIds.length === 0) {
                return {}
        }

        const pipeline = redisClient.multi()
        userIds.forEach(userId => {
                pipeline.exists(PRESENCE_KEY(userId))
        })

        const responses = await pipeline.exec()
        const presence: Record<string, boolean> = {}

        userIds.forEach((userId, index) => {
                const response = responses?.[index]?.[1]
                const numeric = typeof response === 'number' ? response : Number(response ?? 0)
                presence[userId] = numeric === 1
        })

        return presence
}

const cacheThreadMeta = async (threadId: string): Promise<ChatThreadSummary | null> => {
        const cached = await redisClient.get(THREAD_META_CACHE_KEY(threadId))
        if (cached) {
                try {
                        return JSON.parse(cached) as ChatThreadSummary
                } catch {
                        await redisClient.del(THREAD_META_CACHE_KEY(threadId))
                }
	}

	const thread = await prismaClient.chatThread.findUnique({
		where: { id: threadId },
		select: {
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
		}
	})

	if (!thread) {
		return null
	}

        const payload: ChatThreadSummary = {
                id: thread.id,
                type: thread.type,
                subject: thread.subject,
                jobPostId: thread.jobPostId ?? null,
                contractId: thread.contractId ?? null,
		participants: thread.participants.map(participant => ({
			id: participant.id,
			userId: participant.userId,
			role: participant.role,
			profile: {
				firstName: participant.user.profile?.firstName ?? null,
				lastName: participant.user.profile?.lastName ?? null
			}
		}))
	}

	await redisClient.set(THREAD_META_CACHE_KEY(threadId), JSON.stringify(payload), 'EX', THREAD_META_TTL_SECONDS)

	return payload
}

const queueOfflineMessage = async (participantId: string, userId: string, payload: Record<string, unknown>) => {
	const envelope = JSON.stringify({ ...payload, participantId })
	const pipeline = redisClient.multi()
	pipeline.rpush(OFFLINE_QUEUE_KEY(userId), envelope)
	pipeline.ltrim(OFFLINE_QUEUE_KEY(userId), -OFFLINE_QUEUE_MAX_LENGTH, -1)
	await pipeline.exec()
}

const flushOfflineMessages = async (socket: Socket) => {
	const userId = socket.data.user.id
	const key = OFFLINE_QUEUE_KEY(userId)
	const messages = await redisClient.lrange(key, 0, -1)
	if (messages.length === 0) {
		return
	}

	await redisClient.del(key)

	for (const item of messages) {
		try {
			const envelope = JSON.parse(item) as {
				event: string
				data: unknown
				participantId: string
				messageId?: string
			}
			socket.emit(envelope.event, envelope.data)

			if (envelope.messageId && envelope.participantId) {
				await prismaClient.chatMessageReceipt.update({
					where: {
						messageId_participantId: {
							messageId: envelope.messageId,
							participantId: envelope.participantId
						}
					},
					data: {
						deliveredAt: new Date()
					}
				})
			}
		} catch (error) {
			console.error('Failed to replay offline message', error)
		}
	}
}

const appendAnalyticsLog = async (fields: Record<string, string>) => {
	const streamEntries: string[] = []
	Object.entries(fields).forEach(([key, value]) => {
		streamEntries.push(key, value)
	})

	try {
		await redisClient.xadd(ANALYTICS_STREAM_KEY, 'MAXLEN', '~', 1000, '*', ...streamEntries)
	} catch (error) {
		console.error('Failed to append chat analytics log', error)
	}
}

export const registerChatGateway = (io: Server) => {
	const namespace = io.of('/chat')

	namespace.use(authenticateSocket)

        namespace.on('connection', async socket => {
                const user = socket.data.user
                const joinedThreads = new Set<string>()

                await markUserOnline(user.id)
                const heartbeatInterval = Math.max(1000, Math.floor((PRESENCE_TTL_SECONDS / 2) * 1000))
                const presenceHeartbeat = setInterval(() => {
                        void redisClient.expire(PRESENCE_KEY(user.id), PRESENCE_TTL_SECONDS).catch(error => {
                                console.error('Failed to refresh presence TTL', error)
                        })
                }, heartbeatInterval)
                await flushOfflineMessages(socket)

                const memberships = await prismaClient.chatParticipant.findMany({
                        where: { userId: user.id },
                        select: { threadId: true }
                })

                const uniqueThreadIds = Array.from(new Set(memberships.map(item => item.threadId)))
                const presenceSnapshots: {
                        threadId: string
                        presence: Record<string, boolean>
                        participants: ChatThreadSummary['participants']
                }[] = []

                const namespaceSockets = await namespace.fetchSockets()
                const socketsByUser = new Map<string, RemoteSocket<any, any>[]>()

                for (const namespaceSocket of namespaceSockets) {
                        const socketUserId = namespaceSocket.data?.user?.id

                        if (!socketUserId || socketUserId === user.id) {
                                continue
                        }

                        const existing = socketsByUser.get(socketUserId)

                        if (existing) {
                                existing.push(namespaceSocket)
                        } else {
                                socketsByUser.set(socketUserId, [namespaceSocket])
                        }
                }


                for (const threadId of uniqueThreadIds) {
                        const threadMeta = await cacheThreadMeta(threadId)
                        if (!threadMeta) {
                                continue
                        }

                        const presence = await getUsersPresence(
                                threadMeta.participants.map(participant => participant.userId)
                        )

                        presenceSnapshots.push({
                                threadId,
                                presence,
                                participants: threadMeta.participants
                        })


                        const presencePayload = {
                                threadId,
                                userId: user.id,
                                status: 'online' as const
                        }

                        namespace.to(THREAD_ROOM(threadId)).emit('chat:presence', presencePayload)

                        for (const participant of threadMeta.participants) {
                                if (participant.userId === user.id) {
                                        continue
                                }

                                const participantSockets = socketsByUser.get(participant.userId)

                                if (!participantSockets || participantSockets.length === 0) {
                                        continue
                                }

                                const threadRoom = THREAD_ROOM(threadId)
                                const socketsInThread = participantSockets.filter(namespaceSocket =>
                                        namespaceSocket.rooms.has(threadRoom)
                                )

                                if (socketsInThread.length > 0) {
                                        continue
                                }

                                participantSockets.forEach(namespaceSocket => {
                                        namespaceSocket.emit('chat:presence', presencePayload)
                                })
                        }

                }

                if (presenceSnapshots.length > 0) {
                        socket.emit('chat:presence-sync', {
                                threads: presenceSnapshots
                        })
                }

                socket.on('chat:join', async (payload: JoinThreadPayload, ack?: Acknowledgement) => {
                        try {
				if (!payload?.threadId) {
					throw new Error('Thiếu threadId')
				}

				const participant = await prismaClient.chatParticipant.findFirst({
					where: {
						threadId: payload.threadId,
						userId: user.id
					}
				})

				if (!participant) {
					throw new Error('Bạn không có quyền truy cập cuộc hội thoại này')
				}

				joinedThreads.add(payload.threadId)
				socket.join(THREAD_ROOM(payload.threadId))

				const threadMeta = await cacheThreadMeta(payload.threadId)
				if (!threadMeta) {
					throw new Error('Không tìm thấy cuộc hội thoại')
				}
                                const presence = await getUsersPresence(
                                        threadMeta.participants.map(item => item.userId)
                                )

				socket.to(THREAD_ROOM(payload.threadId)).emit('chat:presence', {
					threadId: payload.threadId,
					userId: user.id,
					status: 'online'
				})

				respond(ack, {
					success: true,
					data: {
						thread: threadMeta,
						presence
					}
				})
			} catch (error) {
				respond(ack, {
					success: false,
					message: error instanceof Error ? error.message : 'Không thể tham gia cuộc hội thoại'
				})
			}
		})

		socket.on('chat:leave', (payload: JoinThreadPayload, ack?: Acknowledgement) => {
			const threadId = payload?.threadId
			if (!threadId) {
				respond(ack, { success: false, message: 'Thiếu threadId' })
				return
			}
			joinedThreads.delete(threadId)
			socket.leave(THREAD_ROOM(threadId))
			respond(ack, { success: true })
		})

		socket.on('chat:typing', async (payload: TypingPayload) => {
			if (!payload?.threadId) {
				return
			}

			const participant = await prismaClient.chatParticipant.findFirst({
				where: {
					threadId: payload.threadId,
					userId: user.id
				},
				select: { id: true }
			})

			if (!participant) {
				return
			}

			if (payload.isTyping) {
				await redisClient.set(TYPING_KEY(payload.threadId, user.id), '1', 'EX', TYPING_TTL_SECONDS)
			} else {
				await redisClient.del(TYPING_KEY(payload.threadId, user.id))
			}

			socket.to(THREAD_ROOM(payload.threadId)).emit('chat:typing', {
				threadId: payload.threadId,
				userId: user.id,
				isTyping: payload.isTyping
			})
		})

		socket.on('chat:send-message', async (payload: SendMessagePayload, ack?: Acknowledgement) => {
			try {
				const body = payload?.body?.trim() ?? ''

				if (!payload?.threadId || body.length === 0) {
					throw new Error('Thiếu dữ liệu tin nhắn')
				}

				const participant = await prismaClient.chatParticipant.findFirst({
					where: {
						threadId: payload.threadId,
						userId: user.id
					}
				})

				if (!participant) {
					throw new Error('Bạn không thể gửi tin nhắn trong cuộc hội thoại này')
				}

				await ensureRateLimit(user.id)

				const { message, participants } = await prismaClient.$transaction(async tx => {
					const createdMessage: ChatMessage = await tx.chatMessage.create({
						data: {
							threadId: payload.threadId,
							senderId: user.id,
							senderRole: user.role ?? null,
							type: payload.type ?? 'USER',
							body,
							metadata: payload.metadata ?? ''
						},
						include: {
							sender: {
								select: {
									id: true,
									role: true,
									profile: {
										select: {
											firstName: true,
											lastName: true
										}
									}
								}
							}
						}
					})

					const threadParticipants = await tx.chatParticipant.findMany({
						where: { threadId: payload.threadId },
						select: {
							id: true,
							userId: true,
							role: true
						}
					})

					await Promise.all(
						threadParticipants.map(item =>
							tx.chatMessageReceipt.upsert({
								where: {
									messageId_participantId: {
										messageId: createdMessage.id,
										participantId: item.id
									}
								},
								create: {
									messageId: createdMessage.id,
									participantId: item.id,
									deliveredAt: item.userId === user.id ? new Date() : null,
									readAt: item.userId === user.id ? new Date() : null
								},
								update: {}
							})
						)
					)

					await tx.chatParticipant.update({
						where: { id: participant.id },
						data: {
							lastReadMessageId: createdMessage.id,
							lastReadAt: new Date()
						}
					})

					return {
						message: createdMessage,
						participants: threadParticipants
					}
				})
				const chatMessageSender = await prismaClient.user.findFirst({
					where: {
						id: message.senderId ?? ''
					}
				})

				const responsePayload = {
					tempId: payload.tempId,
					message: {
						id: message.id,
						threadId: message.threadId,
						body: message.body,
						type: message.type,
						senderId: message.senderId ?? null,
						senderRole: message.senderRole ?? null,
						metadata: message.metadata,
						sentAt: message.sentAt,
						sender: chatMessageSender
					}
				}

				const threadRoom = THREAD_ROOM(payload.threadId)

				namespace.to(threadRoom).emit('chat:message', responsePayload)

				await appendAnalyticsLog({
					event: 'message_sent',
					threadId: payload.threadId,
					userId: user.id,
					messageId: message.id
				})

				const namespaceSockets = await namespace.fetchSockets()
				const socketsByUser = new Map<string, RemoteSocket<any, any>[]>()

				for (const namespaceSocket of namespaceSockets) {
					const socketUserId = namespaceSocket.data?.user?.id
					if (!socketUserId) {
						continue
					}

					const bucket = socketsByUser.get(socketUserId)
					if (bucket) {
						bucket.push(namespaceSocket)
					} else {
						socketsByUser.set(socketUserId, [namespaceSocket])
					}
				}

				for (const item of participants) {
					if (item.userId === user.id) {
						continue
					}

					const online = await isUserOnline(item.userId)
					const participantSockets = socketsByUser.get(item.userId) ?? []
					const isInThread = participantSockets.some(namespaceSocket =>
						namespaceSocket.rooms.has(threadRoom)
					)

					if (!online) {
						await queueOfflineMessage(item.id, item.userId, {
							event: 'chat:message',
							data: responsePayload,
							messageId: message.id
						})
					} else {
						await prismaClient.chatMessageReceipt.update({
							where: {
								messageId_participantId: {
									messageId: message.id,
									participantId: item.id
								}
							},
							data: {
								deliveredAt: new Date()
							}
						})

						if (!isInThread && participantSockets.length > 0) {
							for (const namespaceSocket of participantSockets) {
								namespaceSocket.emit('chat:thread-unread', {
									threadId: payload.threadId,
									message: responsePayload.message
								})
							}
						}
					}
				}

				respond(ack, { success: true })
			} catch (error) {
				respond(ack, {
					success: false,
					message: error instanceof Error ? error.message : 'Không thể gửi tin nhắn'
				})
			}
		})

		socket.on('chat:read', async (payload: ReadReceiptPayload, ack?: Acknowledgement) => {
			try {
				if (!payload?.threadId || !payload?.messageId) {
					throw new Error('Thiếu thông tin cập nhật đọc tin')
				}

				const participant = await prismaClient.chatParticipant.findFirst({
					where: {
						threadId: payload.threadId,
						userId: user.id
					}
				})

				if (!participant) {
					throw new Error('Bạn không thuộc cuộc hội thoại này')
				}

				await prismaClient.$transaction([
					prismaClient.chatMessageReceipt.update({
						where: {
							messageId_participantId: {
								messageId: payload.messageId,
								participantId: participant.id
							}
						},
						data: {
							readAt: new Date()
						}
					}),
					prismaClient.chatParticipant.update({
						where: { id: participant.id },
						data: {
							lastReadMessageId: payload.messageId,
							lastReadAt: new Date()
						}
					})
				])

				namespace.to(THREAD_ROOM(payload.threadId)).emit('chat:read', {
					threadId: payload.threadId,
					messageId: payload.messageId,
					userId: user.id
				})

				respond(ack, { success: true })
			} catch (error) {
				respond(ack, {
					success: false,
					message: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái đọc'
				})
			}
		})

		socket.on('disconnect', async () => {
			clearInterval(presenceHeartbeat)
			const stillOnline = await markUserOffline(user.id)
			if (!stillOnline) {
				for (const threadId of joinedThreads) {
					namespace.to(THREAD_ROOM(threadId)).emit('chat:presence', {
						threadId,
						userId: user.id,
						status: 'offline'
					})
				}
			}
                })
        })

        const handleThreadCreated = async (
                payload: ChatRealtimeEventPayloads[(typeof ChatRealtimeEvent)['THREAD_CREATED']]
        ) => {
                const { thread } = payload

                try {
                        await redisClient.set(
                                THREAD_META_CACHE_KEY(thread.id),
                                JSON.stringify(thread),
                                'EX',
                                THREAD_META_TTL_SECONDS
                        )
                } catch (error) {
                        // eslint-disable-next-line no-console
                        console.error('Failed to cache thread metadata', error)
                }

                const sockets = await namespace.fetchSockets()
                const socketsByUser = new Map<string, RemoteSocket<any, any>[]>()

                for (const socket of sockets) {
                        const socketUserId = socket.data?.user?.id
                        if (!socketUserId) {
                                continue
                        }

                        const bucket = socketsByUser.get(socketUserId)
                        if (bucket) {
                                bucket.push(socket)
                        } else {
                                socketsByUser.set(socketUserId, [socket])
                        }
                }

                for (const participant of thread.participants) {
                        const roomPayload = { thread }
                        const userSockets = socketsByUser.get(participant.userId)

                        if (userSockets && userSockets.length > 0) {
                                userSockets.forEach(socket => {
                                        socket.emit('chat:thread-created', roomPayload)
                                })
                                continue
                        }

                        try {
                                await queueOfflineMessage(participant.id, participant.userId, {
                                        event: 'chat:thread-created',
                                        data: roomPayload
                                })
                        } catch (error) {
                                // eslint-disable-next-line no-console
                                console.error('Failed to queue offline thread notification', error)
                        }
                }
        }

        chatEventEmitter.on(ChatRealtimeEvent.THREAD_CREATED, handleThreadCreated)

        io.of('/chat').server.on('close', () => {
                chatEventEmitter.off(ChatRealtimeEvent.THREAD_CREATED, handleThreadCreated)
        })
}
