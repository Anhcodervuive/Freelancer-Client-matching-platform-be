import { z } from 'zod'

import { Role } from '~/generated/prisma'

export const ListAdminUsersQuerySchema = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    role: z.nativeEnum(Role).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    search: z.string().trim().max(255).optional()
})

export const UpdateAdminUserRoleSchema = z.object({
    role: z.nativeEnum(Role)
})

export const UpdateAdminUserStatusSchema = z.object({
    isActive: z.boolean()
})

export type ListAdminUsersQueryInput = z.infer<typeof ListAdminUsersQuerySchema>
export type UpdateAdminUserRoleInput = z.infer<typeof UpdateAdminUserRoleSchema>
export type UpdateAdminUserStatusInput = z.infer<typeof UpdateAdminUserStatusSchema>
