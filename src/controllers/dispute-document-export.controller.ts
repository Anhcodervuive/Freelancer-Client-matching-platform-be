import { Request, Response } from 'express'
import { Role } from '~/generated/prisma'
import { ForbiddenException } from '~/exceptions/Forbidden'
import { NotFoundException } from '~/exceptions/not-found'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import disputeDocumentExportService from '~/services/dispute-document-export.service'

/**
 * Get dispute document package for export
 */
const getDisputeDocumentPackage = async (req: Request, res: Response) => {
  try {
    // Allow admins, clients, and freelancers to export dispute documents
    if (!req.user || !req.user.role || !['ADMIN', 'CLIENT', 'FREELANCER'].includes(req.user.role)) {
      throw new ForbiddenException('Only authenticated users can export dispute documents', ErrorCode.FORBIDDEN)
    }

    const { disputeId } = req.params

    if (!disputeId) {
      throw new BadRequestException('Dispute ID is required', ErrorCode.UNPROCESSABLE_ENTITY)
    }

    // Check if dispute is eligible for export
    const isEligible = await disputeDocumentExportService.isEligibleForDocumentExport(
      disputeId, 
      req.user.id, 
      req.user.role
    )
    if (!isEligible) {
      throw new BadRequestException('Dispute is not eligible for document export', ErrorCode.UNPROCESSABLE_ENTITY)
    }

    const documentPackage = await disputeDocumentExportService.getDisputeDocumentPackage(
      disputeId, 
      req.user.id, 
      req.user.role
    )

    res.json({
      success: true,
      data: documentPackage
    })
  } catch (error) {
    console.error('Get dispute document package error:', error)
    if (error instanceof Error && error.message === 'Dispute not found') {
      throw new NotFoundException('Dispute not found', ErrorCode.ITEM_NOT_FOUND)
    }
    throw error
  }
}

/**
 * Close mediation for external resolution
 */
const closeMediationForExternalResolution = async (req: Request, res: Response) => {
  try {
    // Only admins can close mediation
    if (req.user?.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can close mediation', ErrorCode.FORBIDDEN)
    }

    const { disputeId } = req.params
    const { reason } = req.body

    if (!disputeId) {
      throw new BadRequestException('Dispute ID is required', ErrorCode.UNPROCESSABLE_ENTITY)
    }

    if (!reason || reason.trim().length < 10) {
      throw new BadRequestException('Reason must be at least 10 characters long', ErrorCode.UNPROCESSABLE_ENTITY)
    }

    // Check if dispute is eligible for closure
    const isEligible = await disputeDocumentExportService.isEligibleForDocumentExport(
      disputeId, 
      req.user.id, 
      req.user.role
    )
    if (!isEligible) {
      throw new BadRequestException('Dispute is not eligible for closure', ErrorCode.UNPROCESSABLE_ENTITY)
    }

    const updatedDispute = await disputeDocumentExportService.closeMediationForExternalResolution(
      disputeId,
      req.user.id,
      reason.trim()
    )

    res.json({
      success: true,
      data: updatedDispute,
      message: 'Mediation closed for external resolution'
    })
  } catch (error) {
    console.error('Close mediation error:', error)
    throw error
  }
}

/**
 * Check if dispute is eligible for document export
 */
const checkExportEligibility = async (req: Request, res: Response) => {
  try {
    // Allow admins, clients, and freelancers to check eligibility
    if (!req.user || !req.user.role || !['ADMIN', 'CLIENT', 'FREELANCER'].includes(req.user.role)) {
      throw new ForbiddenException('Only authenticated users can check export eligibility', ErrorCode.FORBIDDEN)
    }

    const { disputeId } = req.params

    if (!disputeId) {
      throw new BadRequestException('Dispute ID is required', ErrorCode.UNPROCESSABLE_ENTITY)
    }

    const isEligible = await disputeDocumentExportService.isEligibleForDocumentExport(
      disputeId, 
      req.user.id, 
      req.user.role
    )

    res.json({
      success: true,
      data: {
        disputeId,
        isEligible,
        message: isEligible 
          ? 'Dispute is eligible for document export' 
          : 'Dispute requires at least 2 failed mediation attempts before export'
      }
    })
  } catch (error) {
    console.error('Check export eligibility error:', error)
    throw error
  }
}

// Export controller
const disputeDocumentExportController = {
  getDisputeDocumentPackage,
  closeMediationForExternalResolution,
  checkExportEligibility
}

export default disputeDocumentExportController