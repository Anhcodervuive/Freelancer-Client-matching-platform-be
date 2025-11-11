import { Prisma, NotificationStatus } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { CreateNotificationInput, CreateNotificationSchema } from '~/schema/notification.schema'
import { NotificationRealtimeEvent, notificationEventEmitter } from '~/realtime/notifications/notification.events'
import { ErrorCode } from '~/exceptions/root'
import { NotFoundException } from '~/exceptions/not-found'

const notificationService = {
	async create(input: CreateNotificationInput) {
		const parsed = CreateNotificationSchema.parse(input)

		const notification = await prismaClient.notification.create({
			data: {
				recipientId: parsed.recipientId,
				actorId: parsed.actorId ?? null,
				category: parsed.category,
				event: parsed.event,
				resourceType: parsed.resourceType ?? null,
				resourceId: parsed.resourceId ?? null,
				payload: (parsed.payload ?? {}) as Prisma.InputJsonValue | {},
				status: NotificationStatus.PENDING
			},
			include: {
				actor: {
					include: {
						profile: true
					}
				},
				recipient: {
					include: {
						profile: true
					}
				}
			}
		})

		notificationEventEmitter.emit(NotificationRealtimeEvent.CREATED, notification)

		return notification
	},

	async markAsDelivered(notificationId: string) {
		return prismaClient.notification.update({
			where: { id: notificationId },
			data: {
				deliveredAt: new Date(),
				status: NotificationStatus.DELIVERED
			},
			include: {
				actor: {
					include: {
						profile: true
					}
				},
				recipient: {
					include: {
						profile: true
					}
				}
			}
		})
	},

        async markAsRead(recipientId: string, notificationId: string) {
                const notification = await prismaClient.notification.findFirst({
                        where: {
                                id: notificationId,
                                recipientId
                        }
                })

                if (!notification) {
                        throw new NotFoundException('Notification not found', ErrorCode.ITEM_NOT_FOUND)
                }

                const now = new Date()

                return prismaClient.notification.update({
                        where: { id: notificationId },
                        data: {
                                deliveredAt: now,
                                readAt: now,
                                status: NotificationStatus.READ
                        },
                        include: {
                                actor: {
                                        include: {
                                                profile: true
                                        }
                                },
                                recipient: {
                                        include: {
                                                profile: true
                                        }
                                }
                        }
                })
        },

	async listRecentByRecipient(recipientId: string, limit = 20) {
		return prismaClient.notification.findMany({
			where: { recipientId },
			orderBy: { createdAt: 'desc' },
			take: limit,
			include: {
				actor: {
					include: {
						profile: true
					}
				},
				recipient: {
					include: {
						profile: true
					}
				}
			}
		})
	},

	async deleteNotification(recipientId: string, notificationId: string) {
		const deleted = await prismaClient.notification.deleteMany({
			where: {
				id: notificationId,
				recipientId
			}
		})

		return deleted.count > 0
	}
}

export default notificationService
