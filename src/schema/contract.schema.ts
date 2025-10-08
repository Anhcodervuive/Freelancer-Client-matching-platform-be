import { z } from 'zod'

const RoleParamSchema = z
        .string()
        .trim()
        .transform(value => value.toLowerCase())
        .pipe(z.enum(['client', 'freelancer']))

export const ContractListFilterSchema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        role: RoleParamSchema.optional(),
        search: z.string().trim().min(1).optional()
})

export type ContractListFilterInput = z.infer<typeof ContractListFilterSchema>
