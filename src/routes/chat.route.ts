import { Router } from 'express'

import {
        getChatThreadDetail,
        getChatThreadMessages,
        listMyChatThreads,
        markChatThreadAsRead
} from '~/controllers/chat.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'

const router: Router = Router()

router.get('/threads', authenticateMiddleware, errorHandler(listMyChatThreads))
router.get('/threads/:threadId', authenticateMiddleware, errorHandler(getChatThreadDetail))
router.get('/threads/:threadId/messages', authenticateMiddleware, errorHandler(getChatThreadMessages))
router.post('/threads/:threadId/read', authenticateMiddleware, errorHandler(markChatThreadAsRead))

export default router
