import { PrismaClient } from '../generated/prisma' // đổi path nếu khác

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prismaClient =
	globalForPrisma.prisma ||
	new PrismaClient({
		log: ['query', 'info', 'warn', 'error']
	})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient
