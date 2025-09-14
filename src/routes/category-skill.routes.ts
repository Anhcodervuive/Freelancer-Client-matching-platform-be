import { Router } from 'express'
import {
	getAllCategorySkills,
	attachCategorySkillsByIds,
	attachCategorySkillsItems,
	patchOneCategorySkill,
	deleteOneCategorySkill,
	restoreOneCategorySkill
} from '~/controllers/category-skill.controller'
import { errorHandler } from '~/utils/error-handler'

const r = Router()

// GET /admin/category/:id/skills
r.get('/:id/skill', errorHandler(getAllCategorySkills))

// POST /admin/category/:id/skills/attach (by ids)
r.post('/:id/skills/attach', errorHandler(attachCategorySkillsByIds))

// POST /admin/category/:id/skills/bulk (items with weight)
r.post('/:id/skill/bulk', errorHandler(attachCategorySkillsItems))

// PATCH /admin/category/:id/skills/:skillId
r.patch('/:id/skill/:skillId', errorHandler(patchOneCategorySkill))

// DELETE /admin/category/:id/skills/:skillId (soft delete)
r.delete('/:id/skill/:skillId', errorHandler(deleteOneCategorySkill))

// POST /admin/category/:id/skills/:skillId/restore
r.post('/:id/skill/:skillId/restore', errorHandler(restoreOneCategorySkill))

export default r
