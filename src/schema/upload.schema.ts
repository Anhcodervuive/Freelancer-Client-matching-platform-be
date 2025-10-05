import { z } from 'zod'

export const cloudinarySignSchema = z.object({
	// resource_type chỉ cho phép image | video | raw
	resource_type: z.enum(['image', 'video', 'raw']),
	// tùy chọn: lưu theo user cho quản lý
	folder: z.string().default('chat'),

	threadId: z.string()
})

export const r2PresignSchema = z.object({
	filename: z.string().min(1),
	contentType: z.string().min(1),
	size: z.number().nonnegative(),
	folder: z.string().default('chat'),
	threadId: z.string()
})

export type cloudinarySignType = z.infer<typeof cloudinarySignSchema>
export type r2PresignSignType = z.infer<typeof r2PresignSchema>
