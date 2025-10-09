import { z } from 'zod'

import { ContractStatus } from '~/generated/prisma'

const RoleParamSchema = z
        .string()
        .trim()
        .transform(value => value.toLowerCase())
        .pipe(z.enum(['client', 'freelancer']))

const ContractStatusParamSchema = z.preprocess(value => {
        if (typeof value === 'string') {
                return value.toUpperCase()
        }
        return value
}, z.nativeEnum(ContractStatus))

export const ContractListFilterSchema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        role: RoleParamSchema.optional(),
        search: z.string().trim().min(1).optional(),
        status: ContractStatusParamSchema.optional()
})

export type ContractListFilterInput = z.infer<typeof ContractListFilterSchema>
