import { prisma, runStep } from './_utils'

export async function seedPayments() {
	await runStep('Seed Payment Methods / Escrow', async () => {
		const clients = await prisma.client.findMany({ select: { userId: true } })
		for (const c of clients) {
			await prisma.paymentMethodRef.upsert({
				where: { id: `pm_${c.userId}` },
				create: {
					id: `pm_${c.userId}`,
					userId: c.userId,
					brand: 'visa',
					last4: '4242',
					expMonth: 12,
					expYear: 2030,
					isDefault: true
				},
				update: {}
			})
		}

		// Fund escrow for first milestone of each contract (demo)
		const contracts = await prisma.contract.findMany({ select: { id: true } })
		for (const ctr of contracts) {
			const ms1 = await prisma.milestone.findFirst({ where: { contractId: ctr.id, order: 1 } })
			if (ms1) {
				await prisma.escrow.upsert({
					where: { milestoneId: ms1.id },
					create: { milestoneId: ms1.id, fundedAmount: ms1.amount, status: 'FUNDED' },
					update: {}
				})
			}
		}
	})
}
