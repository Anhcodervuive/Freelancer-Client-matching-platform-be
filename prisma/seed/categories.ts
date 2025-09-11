import { prisma, runStep } from './_utils'
import { CATEGORIES } from '../fixtures/categories'

export async function seedTaxonomy() {
	await runStep('Categories', async () => {
		await prisma.category.createMany({ data: CATEGORIES as any, skipDuplicates: true })
	})
}
