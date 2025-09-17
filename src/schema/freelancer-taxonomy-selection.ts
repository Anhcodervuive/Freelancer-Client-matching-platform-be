import { z } from 'zod'
import { TAXONOMY_LIMITS } from '~/utils/constant'

export const SetCatSpecSchema = z.object({
	categoryIds: z.array(z.string().min(1)).max(TAXONOMY_LIMITS.maxCategories),
	specialtyIds: z.array(z.string().min(1)).max(TAXONOMY_LIMITS.maxSpecialties)
})

export const SetSkillsSchema = z.object({
	skillIds: z.array(z.string().min(1)).max(TAXONOMY_LIMITS.maxSkills)
})
