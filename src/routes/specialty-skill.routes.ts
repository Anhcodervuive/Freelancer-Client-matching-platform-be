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
r.get('/:id/skills', errorHandler(getAllSpecialtySkills))

// POST /admin/specialty/:id/skills/attach
r.post('/:id/skills/attach', errorHandler(attachSpecialtySkillsByIds))

// POST /admin/specialty/:id/skills/bulk
r.post('/:id/skills/bulk', errorHandler(attachSpecialtySkillsItems))

// PATCH /admin/specialty/:id/skills/:skillId
r.patch('/:id/skills/:skillId', errorHandler(patchOneSpecialtySkill))

// DELETE /admin/specialty/:id/skills/:skillId
r.delete('/:id/skills/:skillId', errorHandler(deleteOneSpecialtySkill))

// POST /admin/specialty/:id/skills/:skillId/restore
r.post('/:id/skills/:skillId/restore', errorHandler(restoreOneSpecialtySkill))

export default r
