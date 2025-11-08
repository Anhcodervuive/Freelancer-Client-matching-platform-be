import { z } from 'zod'

const currencySchema = z
        .string()
        .trim()
        .min(3, 'Currency code phải có 3 ký tự')
        .max(3, 'Currency code phải có 3 ký tự')
        .transform(value => value.toUpperCase())

const amountSchema = z
        .union([z.string().trim().min(1, 'Số tiền không hợp lệ'), z.number()])
        .transform(value => value.toString())
        .refine(value => /^\d+(\.\d{1,2})?$/.test(value), {
                message: 'Số tiền phải ở định dạng thập phân với tối đa hai chữ số sau dấu phẩy'
        })

export const CreateFreelancerPayoutSchema = z
        .object({
                amount: amountSchema,
                currency: currencySchema,
                idempotencyKey: z
                        .string()
                        .trim()
                        .min(8, 'Idempotency key phải có ít nhất 8 ký tự')
                        .max(255, 'Idempotency key quá dài')
                        .optional(),
                transferIds: z
                        .array(z.string().trim().min(1, 'Transfer id không hợp lệ'))
                        .max(50, 'Không thể rút quá 50 khoản cùng lúc')
                        .optional()
        })
        .superRefine((data, ctx) => {
                if (!data.transferIds || data.transferIds.length === 0) {
                        return
                }

                const seen = new Set<string>()
                for (const transferId of data.transferIds) {
                        if (seen.has(transferId)) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        message: 'Danh sách transfer chứa phần tử trùng nhau',
                                        path: ['transferIds']
                                })
                                break
                        }
                        seen.add(transferId)
                }
        })

export const FreelancerPayoutQuerySchema = z.object({
        currency: currencySchema.optional(),
        limit: z.coerce.number().int().positive().max(200).optional()
})

type CreateFreelancerPayoutInput = z.infer<typeof CreateFreelancerPayoutSchema>
type FreelancerPayoutQuery = z.infer<typeof FreelancerPayoutQuerySchema>

export type { CreateFreelancerPayoutInput, FreelancerPayoutQuery }
