import { Router } from 'express'
import { errorHandler } from '~/utils/error-handler'
import authenticateMiddleware from '~/middlewares/authentication'
import * as reviewController from '~/controllers/admin/review.controller'

const router = Router()

// GET /api/admin/reviews - List all reviews with filters
router.get('/', authenticateMiddleware, errorHandler(reviewController.listReviews))

// GET /api/admin/reviews/stats - Get review statistics
router.get('/stats', authenticateMiddleware, errorHandler(reviewController.getReviewStats))

// GET /api/admin/reviews/user/:userId - Get user review summary
router.get('/user/:userId', authenticateMiddleware, errorHandler(reviewController.getUserReviewSummary))

// GET /api/admin/reviews/:reviewId - Get review detail
router.get('/:reviewId', authenticateMiddleware, errorHandler(reviewController.getReviewDetail))

export default router
