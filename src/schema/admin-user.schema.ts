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

export const UpdateAdminUserStatusSchema = z.discriminatedUnion('status', [
    z.object({
        status: z.literal('activate')
    }),
    z.object({
        status: z.literal('deactivate')
    }),
    z.object({
        status: z.literal('unban'),
        reactivate: z.boolean().default(true)
    }),
    z
        .object({
            status: z.literal('ban'),
            reason: z
                .string()
                .trim()
                .min(10, 'Lý do phải có ít nhất 10 ký tự')
                .max(255, 'Lý do không được vượt quá 255 ký tự'),
            note: z
                .string()
                .trim()
                .min(1, 'Ghi chú không được để trống')
                .max(500, 'Ghi chú không được vượt quá 500 ký tự')
                .optional(),
            expiresAt: z.coerce.date().optional()
        })
        .superRefine((value, ctx) => {
            if (value.expiresAt && value.expiresAt <= new Date()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Thời gian hết hạn phải ở tương lai',
                    path: ['expiresAt']
                })
            }
        })
])

export type ListAdminUsersQueryInput = z.infer<typeof ListAdminUsersQuerySchema>
export type UpdateAdminUserRoleInput = z.infer<typeof UpdateAdminUserRoleSchema>
export type UpdateAdminUserStatusInput = z.infer<typeof UpdateAdminUserStatusSchema>
