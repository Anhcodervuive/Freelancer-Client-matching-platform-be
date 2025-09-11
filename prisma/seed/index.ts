import { prisma } from './_utils'
import { seedTaxonomy } from './categories'

import { seedPayments } from './payment'

/**
 * Cho phép chạy 1 phần:  `npm run seed -- users profiles`
 * Nếu không truyền gì -> chạy full.
 */
const only = new Set(process.argv.slice(2).map(s => s.toLowerCase()))

async function main() {
	// if (only.size === 0 || only.has('payments')) await seedPayments()
	if (!only.size || only.has('taxonomy')) await seedTaxonomy()
}

main()
	.then(() => prisma.$disconnect())
	.catch(async e => {
		console.error(e)
		await prisma.$disconnect()
		process.exit(1)
	})
