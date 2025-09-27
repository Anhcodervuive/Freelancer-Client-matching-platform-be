import { z } from 'zod'

import { NotificationCategory, NotificationEvent, NotificationResource } from '~/generated/prisma'

export const NotificationPayloadSchema = z
        .record(z.any())
        .optional()

export const CreateNotificationSchema = z
        .object({
                recipientId: z.string().min(1),
                actorId: z.string().min(1).optional(),
                category: z.nativeEnum(NotificationCategory),
                event: z.nativeEnum(NotificationEvent),
                resourceType: z.nativeEnum(NotificationResource).optional(),
                resourceId: z.string().min(1).optional(),
                payload: NotificationPayloadSchema
        })
        .strict()

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>
