import { prismaClient } from '../../src/config/prisma-client'
import { faker } from '@faker-js/faker'

export const prisma = prismaClient

export const env = {
	NODE_ENV: process.env.NODE_ENV ?? 'development',
	BATCH_SIZE: Number(process.env.SEED_BATCH_SIZE ?? 500)
}

export function log(step: string) {
	console.log(`\n——— ${step} ———`)
}

export async function runStep<T>(name: string, fn: () => Promise<T>): Promise<T> {
	const t0 = Date.now()
	log(name)
	try {
		const res = await fn()
		console.log(`✔ ${name} xong trong ${Date.now() - t0}ms`)
		return res
	} catch (e) {
		console.error(`✖ ${name} lỗi:`, e)
		throw e
	}
}

/** upsert tiện: idempotent để chạy nhiều lần không trùng */
export async function upsertMany<T extends { where: any; create: any; update?: any }>(
	ops: T[],
	worker: (op: T) => Promise<any>
) {
	for (const op of ops) await worker(op)
}

export { faker }
