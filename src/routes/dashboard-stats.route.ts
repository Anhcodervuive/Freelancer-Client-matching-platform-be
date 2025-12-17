import { Router } from 'express'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'
import dashboardStatsController from '~/controllers/dashboard-stats.controller'

const router = Router()

// Apply auth middleware to all routes
router.use(authenticateMiddleware)

/**
 * @route GET /dashboard-stats/overview
 * @desc Get complete dashboard overview
 * @access Admin only
 */
router.get('/overview', errorHandler(dashboardStatsController.getDashboardOverview))

/**
 * @route GET /dashboard-stats/users
 * @desc Get user statistics
 * @access Admin only
 */
router.get('/users', errorHandler(dashboardStatsController.getUserStats))

/**
 * @route GET /dashboard-stats/jobs
 * @desc Get job statistics
 * @access Admin only
 */
router.get('/jobs', errorHandler(dashboardStatsController.getJobStats))

/**
 * @route GET /dashboard-stats/contracts
 * @desc Get contract statistics
 * @access Admin only
 */
router.get('/contracts', errorHandler(dashboardStatsController.getContractStats))

/**
 * @route GET /dashboard-stats/financial
 * @desc Get financial statistics
 * @access Admin only
 */
router.get('/financial', errorHandler(dashboardStatsController.getFinancialStats))

/**
 * @route GET /dashboard-stats/disputes
 * @desc Get dispute statistics
 * @access Admin only
 */
router.get('/disputes', errorHandler(dashboardStatsController.getDisputeStats))

/**
 * @route GET /dashboard-stats/quality
 * @desc Get quality statistics
 * @access Admin only
 */
router.get('/quality', errorHandler(dashboardStatsController.getQualityStats))

/**
 * @route GET /dashboard-stats/trends
 * @desc Get trend statistics
 * @access Admin only
 */
router.get('/trends', errorHandler(dashboardStatsController.getTrendStats))

/**
 * @route GET /dashboard-stats/test
 * @desc Test dashboard stats API
 * @access Admin only
 */
router.get('/test', errorHandler(dashboardStatsController.testConnection))

export default router