import { prisma } from './_utils'
import { seedTaxonomy } from './taxonomy'
import { seedPlatformTerms } from './platform-terms'
import { seedPeople } from './people'
import { seedJobs } from './jobs'
import { seedInteractions } from './interactions'

/**
 * Cho phép chạy 1 phần:  `npm run seed -- taxonomy`
 * Nếu không truyền gì -> chạy full.
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
<<<<<<< HEAD
        if (shouldRun('match-interactions', 'match', 'interactions')) await seedMatchInteractions()
=======
        if (shouldRun('interactions', 'match-interactions', 'timeline')) await seedInteractions()
>>>>>>> codex/review-my-project
}

main()
        .then(() => prisma.$disconnect())
        .catch(async e => {
                console.error(e)
                await prisma.$disconnect()
                process.exit(1)
        })
