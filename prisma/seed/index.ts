import { prisma } from './_utils'
import { seedTaxonomy } from './taxonomy'
import { seedPlatformTerms } from './platform-terms'
import { seedPeople } from './people'
import { seedJobs } from './jobs'
import { seedInteractions } from './interactions'
import { seedMLDiverseData } from './ml-diverse-data'
import { seedDemoUsers } from './demo-users'

/**
 * Cho phép chạy 1 phần:  `npm run seed -- taxonomy`
 * Nếu không truyền gì -> chạy full.
 * 
 * Available commands:
 * - npm run seed                    # Run all seeds
 * - npm run seed -- taxonomy        # Only taxonomy
 * - npm run seed -- people          # Only people (clients + freelancers)
 * - npm run seed -- jobs            # Only jobs
 * - npm run seed -- interactions    # Only interactions
 * - npm run seed -- ml-diverse      # Only ML diverse data (for ML training)
 * - npm run seed -- demo            # Only demo users (premium quality accounts)
 */
const only = new Set(process.argv.slice(2).map(s => s.toLowerCase()))

function shouldRun(...keys: string[]) {
        if (!only.size) return true
        return keys.some(key => only.has(key))
}

async function main() {
        if (shouldRun('taxonomy')) await seedTaxonomy()
        if (shouldRun('platform-terms', 'platformterms', 'terms')) await seedPlatformTerms()
        if (shouldRun('people', 'users', 'sample-users')) await seedPeople()
        if (shouldRun('jobs', 'job-posts', 'jobposts')) await seedJobs()
        if (shouldRun('interactions', 'match-interactions', 'timeline')) await seedInteractions()
        
        // ML Diverse Data - Dữ liệu đa dạng cho training ML models
        if (shouldRun('ml-diverse', 'ml', 'diverse', 'ml-data')) await seedMLDiverseData()
        
        // Demo Users - Premium quality accounts for demo/presentation
        if (shouldRun('demo', 'demo-users', 'demousers')) await seedDemoUsers()
}

main()
        .then(() => prisma.$disconnect())
        .catch(async e => {
                console.error(e)
                await prisma.$disconnect()
                process.exit(1)
        })
