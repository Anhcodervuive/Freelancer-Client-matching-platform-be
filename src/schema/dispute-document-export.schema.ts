import { z } from 'zod'

/**
 * Schema for closing mediation for external resolution
 */
export const closeMediationSchema = z.object({
  body: z.object({
    reason: z.string()
      .min(10, 'Reason must be at least 10 characters long')
      .max(1000, 'Reason must not exceed 1000 characters')
      .trim()
  })
})

/**
 * Schema for dispute ID parameter
 */
export const disputeIdParamSchema = z.object({
  params: z.object({
    disputeId: z.string()
      .uuid('Invalid dispute ID format')
  })
})

export type CloseMediationInput = z.infer<typeof closeMediationSchema>['body']
export type DisputeIdParam = z.infer<typeof disputeIdParamSchema>['params']