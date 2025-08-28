import { z } from 'zod'

export const ProficiencyEnum = z.enum(['BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE'])

export const AddOneSchema = z.object({
	languageCode: z.string().min(1).max(10), // ISO 639-1, ví dụ "en"
	proficiency: ProficiencyEnum
})
