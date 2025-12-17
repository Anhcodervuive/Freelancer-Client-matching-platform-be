import { Router } from 'express'
import authenticateMiddleware from '~/middlewares/authentication'
import { errorHandler } from '~/utils/error-handler'
import disputeDocumentExportController from '~/controllers/dispute-document-export.controller'

const router = Router()

// Apply auth middleware to all routes
router.use(authenticateMiddleware)

/**
 * @route GET /dispute-document-export/:disputeId/eligibility
 * @desc Check if dispute is eligible for document export
 * @access Admin only
 */
router.get('/:disputeId/eligibility', errorHandler(disputeDocumentExportController.checkExportEligibility))

/**
 * @route GET /dispute-document-export/:disputeId/package
 * @desc Get complete dispute document package for export
 * @access Admin only
 */
router.get('/:disputeId/package', errorHandler(disputeDocumentExportController.getDisputeDocumentPackage))

/**
 * @route POST /dispute-document-export/:disputeId/close
 * @desc Close mediation for external resolution
 * @access Admin only
 */
router.post('/:disputeId/close', errorHandler(disputeDocumentExportController.closeMediationForExternalResolution))

export default router