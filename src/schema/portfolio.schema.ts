import { z } from 'zod'
import { PortfolioVisibility } from '~/generated/prisma'

const nullableString = (schema: z.ZodString) => schema.optional().nullable()
const nullableUrl = () => z.string().url().max(2048).optional().nullable()
const nullableDate = () => z.union([z.coerce.date(), z.null()]).optional()

const basePortfolioSchema = z
        .object({
                title: z.string().min(3).max(255),
                role: nullableString(z.string().max(255)),
                description: nullableString(z.string().max(5000)),
                projectUrl: nullableUrl(),
                repositoryUrl: nullableUrl(),
                visibility: z.nativeEnum(PortfolioVisibility).optional(),
                startedAt: nullableDate(),
                completedAt: nullableDate(),
                publishedAt: nullableDate(),
                coverAssetId: z.string().cuid().optional().nullable(),
                galleryAssetIds: z.array(z.string().cuid()).optional(),
                skillIds: z.array(z.string().min(1)).optional()
        })
        .superRefine((data, ctx) => {
                if (data.startedAt instanceof Date && data.completedAt instanceof Date && data.startedAt > data.completedAt) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'startedAt phải nhỏ hơn hoặc bằng completedAt',
                                path: ['startedAt']
                        })
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'completedAt phải lớn hơn hoặc bằng startedAt',
                                path: ['completedAt']
                        })
                }

                if (data.galleryAssetIds) {
                        const seen = new Set<string>()
                        for (const id of data.galleryAssetIds) {
                                if (seen.has(id)) {
                                        ctx.addIssue({
                                                code: z.ZodIssueCode.custom,
                                                message: 'galleryAssetIds không được chứa phần tử trùng nhau',
                                                path: ['galleryAssetIds']
                                        })
                                        break
                                }
                                seen.add(id)
                        }
                }

                if (data.skillIds) {
                        const seen = new Set<string>()
                        for (const id of data.skillIds) {
                                if (seen.has(id)) {
                                        ctx.addIssue({
                                                code: z.ZodIssueCode.custom,
                                                message: 'skillIds không được chứa phần tử trùng nhau',
                                                path: ['skillIds']
                                        })
                                        break
                                }
                                seen.add(id)
                        }
                }

                if (data.coverAssetId && data.galleryAssetIds?.includes(data.coverAssetId)) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'coverAssetId không được trùng với galleryAssetIds',
                                path: ['coverAssetId']
                        })
                }
        })

export const CreatePortfolioSchema = basePortfolioSchema

export type CreatePortfolioInput = z.infer<typeof CreatePortfolioSchema>

export const UpdatePortfolioSchema = basePortfolioSchema.partial()

export type UpdatePortfolioInput = z.infer<typeof UpdatePortfolioSchema>
