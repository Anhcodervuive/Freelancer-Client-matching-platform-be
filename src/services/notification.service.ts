import { Prisma, NotificationStatus } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { CreateNotificationInput, CreateNotificationSchema } from '~/schema/notification.schema'
import {
        NotificationRealtimeEvent,
        notificationEventEmitter
} from '~/realtime/notifications/notification.events'

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
                                payload: (parsed.payload ?? null) as Prisma.InputJsonValue | null,
                                status: NotificationStatus.PENDING
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
                        }
                })
        },

        async markAsRead(notificationId: string) {
                const now = new Date()

                return prismaClient.notification.update({
                        where: { id: notificationId },
                        data: {
                                deliveredAt: now,
                                readAt: now,
                                status: NotificationStatus.READ
                        }
                })
        },

        async listRecentByRecipient(recipientId: string, limit = 20) {
                return prismaClient.notification.findMany({
                        where: { recipientId },
                        orderBy: { createdAt: 'desc' },
                        take: limit
                })
        }
}

export default notificationService
