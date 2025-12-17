import { Request, Response } from 'express'
import { Role } from '~/generated/prisma'
import { ForbiddenException } from '~/exceptions/Forbidden'
import { ErrorCode } from '~/exceptions/root'
import dashboardStatsService from '~/services/dashboard-stats.service'

/**
 * Get complete dashboard overview
 */
const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    // Only admins can access dashboard stats
    if (req.user?.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can access dashboard statistics', ErrorCode.FORBIDDEN)
    }

    const overview = await dashboardStatsService.getDashboardOverview()
    
    res.json({
      success: true,
      data: overview
    })
  } catch (error) {
    console.error('Dashboard overview error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Get user statistics
 */
const getUserStats = async (req: Request, res: Response) => {
  if (req.user?.role !== Role.ADMIN) {
    throw new ForbiddenException('Only admins can access user statistics', ErrorCode.FORBIDDEN)
  }

  const stats = await dashboardStatsService.getUserStats()
  
  res.json({
    success: true,
    data: stats
  })
}

/**
 * Get job statistics
 */
const getJobStats = async (req: Request, res: Response) => {
  if (req.user?.role !== Role.ADMIN) {
    throw new ForbiddenException('Only admins can access job statistics', ErrorCode.FORBIDDEN)
  }

  const stats = await dashboardStatsService.getJobStats()
  
  res.json({
    success: true,
    data: stats
  })
}

/**
 * Get contract statistics
 */
const getContractStats = async (req: Request, res: Response) => {
  if (req.user?.role !== Role.ADMIN) {
    throw new ForbiddenException('Only admins can access contract statistics', ErrorCode.FORBIDDEN)
  }

  const stats = await dashboardStatsService.getContractStats()
  
  res.json({
    success: true,
    data: stats
  })
}

/**
 * Get financial statistics
 */
const getFinancialStats = async (req: Request, res: Response) => {
  if (req.user?.role !== Role.ADMIN) {
    throw new ForbiddenException('Only admins can access financial statistics', ErrorCode.FORBIDDEN)
  }

  const stats = await dashboardStatsService.getFinancialStats()
  
  res.json({
    success: true,
    data: stats
  })
}

/**
 * Get dispute statistics
 */
const getDisputeStats = async (req: Request, res: Response) => {
  if (req.user?.role !== Role.ADMIN) {
    throw new ForbiddenException('Only admins can access dispute statistics', ErrorCode.FORBIDDEN)
  }

  const stats = await dashboardStatsService.getDisputeStats()
  
  res.json({
    success: true,
    data: stats
  })
}

/**
 * Get quality statistics
 */
const getQualityStats = async (req: Request, res: Response) => {
  if (req.user?.role !== Role.ADMIN) {
    throw new ForbiddenException('Only admins can access quality statistics', ErrorCode.FORBIDDEN)
  }

  const stats = await dashboardStatsService.getQualityStats()
  
  res.json({
    success: true,
    data: stats
  })
}

/**
 * Get trend statistics
 */
const getTrendStats = async (req: Request, res: Response) => {
  if (req.user?.role !== Role.ADMIN) {
    throw new ForbiddenException('Only admins can access trend statistics', ErrorCode.FORBIDDEN)
  }

  const stats = await dashboardStatsService.getTrendStats()
  
  res.json({
    success: true,
    data: stats
  })
}

/**
 * Test endpoint to check if dashboard stats is working
 */
const testConnection = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Dashboard stats API is working',
      timestamp: new Date().toISOString(),
      user: req.user ? { id: req.user.id, role: req.user.role } : null
    })
  } catch (error) {
    console.error('Test connection error:', error)
    res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Export controller
const dashboardStatsController = {
  getDashboardOverview,
  getUserStats,
  getJobStats,
  getContractStats,
  getFinancialStats,
  getDisputeStats,
  getQualityStats,
  getTrendStats,
  testConnection
}

export default dashboardStatsController