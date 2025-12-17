import { prismaClient } from '~/config/prisma-client'
import { Role, JobStatus, ContractStatus } from '~/generated/prisma'

interface UserStats {
  total: number
  clients: number
  freelancers: number
  admins: number
  newThisMonth: number
  activeUsers: number
  growthRate: number
}

interface JobStats {
  total: number
  published: number
  closed: number
  draft: number
  averageValue: number
  totalValue: number
  byCategory: Array<{ categoryName: string; count: number }>
  bySpecialty: Array<{ specialtyName: string; count: number }>
  successRate: number
}

interface ContractStats {
  total: number
  active: number
  completed: number
  cancelled: number
  successRate: number
  averageDuration: number
  totalValue: number
  averageValue: number
}

interface FinancialStats {
  totalRevenue: number
  monthlyRevenue: number
  escrowAmount: number
  releasedAmount: number
  refundedAmount: number
  platformFees: number
  revenueByMonth: Array<{ month: string; revenue: number }>
}

interface DisputeStats {
  total: number
  open: number
  resolved: number
  mediation: number
  arbitration: number
  resolutionRate: number
  averageResolutionTime: number
  resolutionsByType: Array<{ type: string; count: number }>
}

interface QualityStats {
  averageRating: number
  totalFeedbacks: number
  positiveRate: number
  repeatClientRate: number
  completionRate: number
  onTimeRate: number
}

interface TrendStats {
  userGrowth: Array<{ month: string; count: number }>
  jobGrowth: Array<{ month: string; count: number }>
  revenueGrowth: Array<{ month: string; revenue: number }>
  popularSkills: Array<{ skillName: string; demand: number; growth: number }>
  marketDemand: Array<{ specialtyName: string; jobs: number; avgBudget: number }>
  pricetrends: Array<{ month: string; avgPrice: number; jobCount: number }>
}

interface DashboardOverview {
  users: UserStats
  jobs: JobStats
  contracts: ContractStats
  financial: FinancialStats
  disputes: DisputeStats
  quality: QualityStats
  trends: TrendStats
}

/**
 * Get user statistics
 */
const getUserStats = async (): Promise<UserStats> => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  // Total users by role
  const usersByRole = await prismaClient.user.groupBy({
    by: ['role'],
    _count: { id: true },
    where: { deletedAt: null }
  })

  const total = usersByRole.reduce((sum, group) => sum + group._count.id, 0)
  const clients = usersByRole.find(g => g.role === Role.CLIENT)?._count.id || 0
  const freelancers = usersByRole.find(g => g.role === Role.FREELANCER)?._count.id || 0
  const admins = usersByRole.find(g => g.role === Role.ADMIN)?._count.id || 0

  // New users this month
  const newThisMonth = await prismaClient.user.count({
    where: {
      createdAt: { gte: startOfMonth },
      deletedAt: null
    }
  })

  // Active users (logged in last 30 days - approximated by recent activity)
  const activeUsers = await prismaClient.user.count({
    where: {
      updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      deletedAt: null
    }
  })

  // Growth rate calculation
  const lastMonthUsers = await prismaClient.user.count({
    where: {
      createdAt: { gte: startOfLastMonth, lt: lastMonth },
      deletedAt: null
    }
  })

  const growthRate = lastMonthUsers > 0 ? ((newThisMonth - lastMonthUsers) / lastMonthUsers) * 100 : 0

  return {
    total,
    clients,
    freelancers,
    admins,
    newThisMonth,
    activeUsers,
    growthRate
  }
}

/**
 * Get job statistics
 */
const getJobStats = async (): Promise<JobStats> => {
  // Total jobs by status
  const jobsByStatus = await prismaClient.jobPost.groupBy({
    by: ['status'],
    _count: { id: true },
    where: { isDeleted: false }
  })

  const total = jobsByStatus.reduce((sum, group) => sum + group._count.id, 0)
  const published = jobsByStatus.find(g => g.status === JobStatus.PUBLISHED)?._count.id || 0
  const closed = jobsByStatus.find(g => g.status === JobStatus.CLOSED)?._count.id || 0
  const draft = jobsByStatus.find(g => g.status === JobStatus.DRAFT)?._count.id || 0

  // Budget statistics
  const budgetStats = await prismaClient.jobPost.aggregate({
    _avg: { budgetAmount: true },
    _sum: { budgetAmount: true },
    where: {
      isDeleted: false,
      budgetAmount: { not: null }
    }
  })

  // Jobs by category
  const byCategory = await prismaClient.jobPost.groupBy({
    by: ['specialtyId'],
    _count: { id: true },
    where: { isDeleted: false },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  })

  const categoryData = await Promise.all(
    byCategory.map(async (item) => {
      const specialty = await prismaClient.specialty.findUnique({
        where: { id: item.specialtyId },
        include: { category: true }
      })
      return {
        categoryName: specialty?.category.name || 'Unknown',
        count: item._count.id
      }
    })
  )

  // Jobs by specialty
  const bySpecialty = await Promise.all(
    byCategory.map(async (item) => {
      const specialty = await prismaClient.specialty.findUnique({
        where: { id: item.specialtyId }
      })
      return {
        specialtyName: specialty?.name || 'Unknown',
        count: item._count.id
      }
    })
  )

  // Success rate (jobs that got contracts)
  const jobsWithContracts = await prismaClient.jobPost.count({
    where: {
      isDeleted: false,
      contracts: { some: {} }
    }
  })

  const successRate = total > 0 ? (jobsWithContracts / total) * 100 : 0

  return {
    total,
    published,
    closed,
    draft,
    averageValue: Number(budgetStats._avg.budgetAmount) || 0,
    totalValue: Number(budgetStats._sum.budgetAmount) || 0,
    byCategory: categoryData,
    bySpecialty,
    successRate
  }
}

/**
 * Get contract statistics
 */
const getContractStats = async (): Promise<ContractStats> => {
  // Contracts by status
  const contractsByStatus = await prismaClient.contract.groupBy({
    by: ['status'],
    _count: { id: true }
  })

  const total = contractsByStatus.reduce((sum, group) => sum + group._count.id, 0)
  const active = contractsByStatus.find(g => g.status === ContractStatus.ACTIVE)?._count.id || 0
  const completed = contractsByStatus.find(g => g.status === ContractStatus.COMPLETED)?._count.id || 0
  const cancelled = contractsByStatus.find(g => g.status === ContractStatus.CANCELLED)?._count.id || 0

  // Success rate
  const successRate = total > 0 ? (completed / total) * 100 : 0

  // Contract values
  const contractValues = await prismaClient.milestone.aggregate({
    _sum: { amount: true },
    _avg: { amount: true }
  })

  // Average duration (for completed contracts)
  const completedContracts = await prismaClient.contract.findMany({
    where: { status: ContractStatus.COMPLETED },
    select: { createdAt: true, endedAt: true }
  })

  const averageDuration = completedContracts.length > 0 
    ? completedContracts.reduce((sum, contract) => {
        if (contract.endedAt) {
          const duration = contract.endedAt.getTime() - contract.createdAt.getTime()
          return sum + duration / (1000 * 60 * 60 * 24) // days
        }
        return sum
      }, 0) / completedContracts.length
    : 0

  return {
    total,
    active,
    completed,
    cancelled,
    successRate,
    averageDuration,
    totalValue: Number(contractValues._sum.amount) || 0,
    averageValue: Number(contractValues._avg.amount) || 0
  }
}

/**
 * Get financial statistics
 */
const getFinancialStats = async (): Promise<FinancialStats> => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Escrow statistics
  const escrowStats = await prismaClient.escrow.aggregate({
    _sum: {
      amountFunded: true,
      amountReleased: true,
      amountRefunded: true,
      platformFeeTotal: true
    }
  })

  // Monthly revenue (this month)
  const monthlyRevenue = await prismaClient.escrow.aggregate({
    _sum: { platformFeeTotal: true },
    where: {
      createdAt: { gte: startOfMonth }
    }
  })

  // Revenue by month (last 12 months)
  const revenueByMonth = []
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    
    const monthRevenue = await prismaClient.escrow.aggregate({
      _sum: { platformFeeTotal: true },
      where: {
        createdAt: { gte: monthStart, lt: monthEnd }
      }
    })

    revenueByMonth.push({
      month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
      revenue: Number(monthRevenue._sum.platformFeeTotal) || 0
    })
  }

  return {
    totalRevenue: Number(escrowStats._sum.platformFeeTotal) || 0,
    monthlyRevenue: Number(monthlyRevenue._sum.platformFeeTotal) || 0,
    escrowAmount: Number(escrowStats._sum.amountFunded) || 0,
    releasedAmount: Number(escrowStats._sum.amountReleased) || 0,
    refundedAmount: Number(escrowStats._sum.amountRefunded) || 0,
    platformFees: Number(escrowStats._sum.platformFeeTotal) || 0,
    revenueByMonth
  }
}

/**
 * Get dispute statistics
 */
const getDisputeStats = async (): Promise<DisputeStats> => {
  // Disputes by status
  const disputesByStatus = await prismaClient.dispute.groupBy({
    by: ['status'],
    _count: { id: true }
  })

  const total = disputesByStatus.reduce((sum, group) => sum + group._count.id, 0)
  const open = disputesByStatus.find(g => g.status === 'OPEN')?._count.id || 0
  const mediation = disputesByStatus.find(g => g.status === 'INTERNAL_MEDIATION')?._count.id || 0
  const arbitration = disputesByStatus.find(g => g.status === 'ARBITRATION')?._count.id || 0
  
  const resolvedStatuses = ['RESOLVED_RELEASE_ALL', 'RESOLVED_REFUND_ALL', 'RESOLVED_SPLIT']
  const resolved = disputesByStatus
    .filter(g => resolvedStatuses.includes(g.status))
    .reduce((sum, group) => sum + group._count.id, 0)

  const resolutionRate = total > 0 ? (resolved / total) * 100 : 0

  // Average resolution time
  const resolvedDisputes = await prismaClient.dispute.findMany({
    where: {
      status: { in: resolvedStatuses as any },
      decidedAt: { not: null }
    },
    select: { createdAt: true, decidedAt: true }
  })

  const averageResolutionTime = resolvedDisputes.length > 0
    ? resolvedDisputes.reduce((sum, dispute) => {
        if (dispute.decidedAt) {
          const duration = dispute.decidedAt.getTime() - dispute.createdAt.getTime()
          return sum + duration / (1000 * 60 * 60 * 24) // days
        }
        return sum
      }, 0) / resolvedDisputes.length
    : 0

  // Resolutions by type
  const resolutionsByType = disputesByStatus
    .filter(g => resolvedStatuses.includes(g.status))
    .map(g => ({
      type: g.status.replace('RESOLVED_', '').toLowerCase(),
      count: g._count.id
    }))

  return {
    total,
    open,
    resolved,
    mediation,
    arbitration,
    resolutionRate,
    averageResolutionTime,
    resolutionsByType
  }
}

/**
 * Get quality statistics
 */
const getQualityStats = async (): Promise<QualityStats> => {
  // Average rating
  const ratingStats = await prismaClient.contractFeedback.aggregate({
    _avg: { rating: true },
    _count: { id: true }
  })

  // Positive rate (rating >= 4)
  const positiveRatings = await prismaClient.contractFeedback.count({
    where: { rating: { gte: 4 } }
  })

  const positiveRate = ratingStats._count.id > 0 
    ? (positiveRatings / ratingStats._count.id) * 100 
    : 0

  // Repeat client rate
  const clientsWithMultipleContracts = await prismaClient.client.count({
    where: {
      contracts: {
        some: {
          status: ContractStatus.COMPLETED
        }
      }
    }
  })

  const totalClients = await prismaClient.client.count()
  const repeatClientRate = totalClients > 0 ? (clientsWithMultipleContracts / totalClients) * 100 : 0

  // Completion rate
  const totalContracts = await prismaClient.contract.count()
  const completedContracts = await prismaClient.contract.count({
    where: { status: ContractStatus.COMPLETED }
  })
  const completionRate = totalContracts > 0 ? (completedContracts / totalContracts) * 100 : 0

  // On-time rate (milestones completed before deadline)
  const totalMilestones = await prismaClient.milestone.count({
    where: { 
      status: 'RELEASED',
      endAt: { not: null }
    }
  })
  
  // Get milestones with both releasedAt and endAt to compare
  const milestonesWithDates = await prismaClient.milestone.findMany({
    where: {
      status: 'RELEASED',
      releasedAt: { not: null },
      endAt: { not: null }
    },
    select: {
      releasedAt: true,
      endAt: true
    }
  })

  const onTimeMilestones = milestonesWithDates.filter(m => 
    m.releasedAt && m.endAt && m.releasedAt <= m.endAt
  ).length

  const onTimeRate = totalMilestones > 0 ? (onTimeMilestones / totalMilestones) * 100 : 0

  return {
    averageRating: Number(ratingStats._avg.rating) || 0,
    totalFeedbacks: ratingStats._count.id,
    positiveRate,
    repeatClientRate,
    completionRate,
    onTimeRate
  }
}

/**
 * Get trend statistics
 */
const getTrendStats = async (): Promise<TrendStats> => {
  const now = new Date()

  // User growth (last 12 months)
  const userGrowth = []
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    
    const count = await prismaClient.user.count({
      where: {
        createdAt: { gte: monthStart, lt: monthEnd },
        deletedAt: null
      }
    })

    userGrowth.push({
      month: monthStart.toISOString().slice(0, 7),
      count
    })
  }

  // Job growth (last 12 months)
  const jobGrowth = []
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    
    const count = await prismaClient.jobPost.count({
      where: {
        createdAt: { gte: monthStart, lt: monthEnd },
        isDeleted: false
      }
    })

    jobGrowth.push({
      month: monthStart.toISOString().slice(0, 7),
      count
    })
  }

  // Revenue growth (already calculated in financial stats)
  const revenueGrowth = []
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    
    const revenue = await prismaClient.escrow.aggregate({
      _sum: { platformFeeTotal: true },
      where: {
        createdAt: { gte: monthStart, lt: monthEnd }
      }
    })

    revenueGrowth.push({
      month: monthStart.toISOString().slice(0, 7),
      revenue: Number(revenue._sum.platformFeeTotal) || 0
    })
  }

  // Popular skills
  const skillDemand = await prismaClient.jobRequiredSkill.groupBy({
    by: ['skillId'],
    _count: { skillId: true },
    orderBy: { _count: { skillId: 'desc' } },
    take: 20
  })

  const popularSkills = await Promise.all(
    skillDemand.map(async (item) => {
      const skill = await prismaClient.skill.findUnique({
        where: { id: item.skillId }
      })

      // Calculate growth (compare last 3 months vs previous 3 months)
      const recent = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      const older = new Date(now.getFullYear(), now.getMonth() - 6, 1)

      const recentDemand = await prismaClient.jobRequiredSkill.count({
        where: {
          skillId: item.skillId,
          job: { createdAt: { gte: recent } }
        }
      })

      const olderDemand = await prismaClient.jobRequiredSkill.count({
        where: {
          skillId: item.skillId,
          job: { createdAt: { gte: older, lt: recent } }
        }
      })

      const growth = olderDemand > 0 ? ((recentDemand - olderDemand) / olderDemand) * 100 : 0

      return {
        skillName: skill?.name || 'Unknown',
        demand: item._count.skillId,
        growth
      }
    })
  )

  // Market demand by specialty
  const specialtyDemand = await prismaClient.jobPost.groupBy({
    by: ['specialtyId'],
    _count: { id: true },
    _avg: { budgetAmount: true },
    where: { isDeleted: false },
    orderBy: { _count: { id: 'desc' } },
    take: 15
  })

  const marketDemand = await Promise.all(
    specialtyDemand.map(async (item) => {
      const specialty = await prismaClient.specialty.findUnique({
        where: { id: item.specialtyId }
      })

      return {
        specialtyName: specialty?.name || 'Unknown',
        jobs: item._count.id,
        avgBudget: Number(item._avg.budgetAmount) || 0
      }
    })
  )

  // Price trends (last 12 months)
  const pricetrends = []
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    
    const monthStats = await prismaClient.jobPost.aggregate({
      _avg: { budgetAmount: true },
      _count: { id: true },
      where: {
        createdAt: { gte: monthStart, lt: monthEnd },
        isDeleted: false,
        budgetAmount: { not: null }
      }
    })

    pricetrends.push({
      month: monthStart.toISOString().slice(0, 7),
      avgPrice: Number(monthStats._avg.budgetAmount) || 0,
      jobCount: monthStats._count.id
    })
  }

  return {
    userGrowth,
    jobGrowth,
    revenueGrowth,
    popularSkills,
    marketDemand,
    pricetrends
  }
}

/**
 * Get complete dashboard overview
 */
const getDashboardOverview = async (): Promise<DashboardOverview> => {
  const [users, jobs, contracts, financial, disputes, quality, trends] = await Promise.all([
    getUserStats(),
    getJobStats(),
    getContractStats(),
    getFinancialStats(),
    getDisputeStats(),
    getQualityStats(),
    getTrendStats()
  ])

  return {
    users,
    jobs,
    contracts,
    financial,
    disputes,
    quality,
    trends
  }
}

// Export service
const dashboardStatsService = {
  getUserStats,
  getJobStats,
  getContractStats,
  getFinancialStats,
  getDisputeStats,
  getQualityStats,
  getTrendStats,
  getDashboardOverview
}

export default dashboardStatsService