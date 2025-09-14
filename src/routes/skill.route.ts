import { Router } from 'express'
import { createSkill, deleteSkill, listSkills, updateSkill } from '~/controllers/skill.controller'
import { errorHandler } from '~/utils/error-handler'

const r = Router()

// GET /admin/skills?search=&page=&limit=&onlyActive=
r.get('/', errorHandler(listSkills))
r.post('/', errorHandler(createSkill))
r.put('/:id', errorHandler(updateSkill))
r.delete('/:id', errorHandler(deleteSkill))

export default r
