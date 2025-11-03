import { z } from 'zod'

export const JobModerationTriggerSchema = z.enum(['CREATE', 'UPDATE', 'MANUAL'])

export const JobModerationQueuePayloadSchema = z
        .object({
                jobPostId: z.string().min(1, 'jobPostId là bắt buộc'),
                trigger: JobModerationTriggerSchema.default('UPDATE')
        })
        .strict()

export type JobModerationTrigger = z.infer<typeof JobModerationTriggerSchema>
export type JobModerationQueuePayload = z.infer<typeof JobModerationQueuePayloadSchema>
