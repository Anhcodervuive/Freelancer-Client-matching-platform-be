import { Router } from 'express'
import {
	attachSpecialtySkillsByIds,
	attachSpecialtySkillsItems,
	patchOneSpecialtySkill,
	deleteOneSpecialtySkill,
	restoreOneSpecialtySkill,
	getAllSpecialtySkills
} from '~/controllers/specialty-skill.controller'
import { errorHandler } from '~/utils/error-handler'

const r = Router()

// GET /admin/specialty/:id/skills
r.get('/:id/skill', errorHandler(getAllSpecialtySkills))

// POST /admin/specialty/:id/skills/attach
r.post('/:id/skill/attach', errorHandler(attachSpecialtySkillsByIds))

// POST /admin/specialty/:id/skills/bulk
r.post('/:id/skill/bulk', errorHandler(attachSpecialtySkillsItems))

// PATCH /admin/specialty/:id/skills/:skillId
r.patch('/:id/skill/:skillId', errorHandler(patchOneSpecialtySkill))

// DELETE /admin/specialty/:id/skills/:skillId
r.delete('/:id/skill/:skillId', errorHandler(deleteOneSpecialtySkill))

// POST /admin/specialty/:id/skills/:skillId/restore
r.post('/:id/skill/:skillId/restore', errorHandler(restoreOneSpecialtySkill))

export default r
