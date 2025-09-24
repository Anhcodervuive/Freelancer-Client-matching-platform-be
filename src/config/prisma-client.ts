// src/config/prisma-client.ts
import { PrismaClient } from '../generated/prisma' // chỉnh path cho đúng
// Reuse instance ở dev hot-reload
const g = globalThis as unknown as { __basePrisma?: PrismaClient }
const base = g.__basePrisma ?? new PrismaClient({ log: ['warn', 'error', 'query'] })
if (process.env.NODE_ENV !== 'production') g.__basePrisma = base

// CHỈ các model này mới có isDeleted
const SOFT_MODELS = new Set<string>([
        'PaymentMethodRef',
        'Category',
        'Specialty',
        'Skill',
        'CategorySkill',
        'SpecialtySkill',
        'FreelancerCategorySelection',
        'FreelancerSpecialtySelection',
        'FreelancerSkillSelection',
        'PortfolioProject',
        'JobPost'
])
// helper: tên property delegate trên PrismaClient là lowerCamelCase
const toDelegate = (model: string) => (model && model.length > 0 ? model[0]?.toLowerCase() + model.slice(1) : '')

export const prismaClient = base.$extends({
	name: 'softDelete',
	query: {
		$allModels: {
			async findFirst({ model, args, query }) {
				if (SOFT_MODELS.has(model) && !(args as any).__withDeleted) {
					;(args as any).where = {
						AND: [{ isDeleted: false }, (args as any).where ?? {}]
					}
				}
				// xoá cờ custom nếu có
				if ((args as any).__withDeleted) {
					;(args as any).where = {
						AND: [{ isDeleted: true }, (args as any).where ?? {}]
					}
					delete (args as any).__withDeleted
				}
				return query(args)
			},
			async findMany({ model, args, query }) {
				if (SOFT_MODELS.has(model) && !(args as any).__withDeleted) {
					;(args as any).where = {
						AND: [{ isDeleted: false }, (args as any).where ?? {}]
					}
				}
				if ((args as any).__withDeleted) {
					;(args as any).where = {
						AND: [{ isDeleted: true }, (args as any).where ?? {}]
					}
					delete (args as any).__withDeleted
				}
				return query(args)
			},
			async count({ model, args, query }) {
				if (SOFT_MODELS.has(model) && !(args as any).__withDeleted) {
					;(args as any).where = {
						AND: [{ isDeleted: false }, (args as any).where ?? {}]
					}
				}
				if ((args as any).__withDeleted) {
					;(args as any).where = {
						AND: [{ isDeleted: true }, (args as any).where ?? {}]
					}
					delete (args as any).__withDeleted
				}
				return query(args)
			},

			// ⬇⬇ SỬA LỖI Ở ĐÂY
			async delete({ model, args, query }) {
				if (SOFT_MODELS.has(model)) {
					const delegate = (base as any)[toDelegate(model)]
					return delegate.update({
						where: (args as any).where,
						data: { isDeleted: true, deletedAt: new Date() }
					})
				}
				// model KHÔNG soft-delete -> chạy hành vi gốc
				return query(args)
			},
			async deleteMany({ model, args, query }) {
				if (SOFT_MODELS.has(model)) {
					const delegate = (base as any)[toDelegate(model)]
					return delegate.updateMany({
						where: (args as any).where,
						data: { isDeleted: true, deletedAt: new Date() }
					})
				}
				return query(args)
			}
		}
	},
	model: {
		$allModels: {
			async softDelete(this: any, where: any, deletedBy?: string) {
				return this.update({
					where,
					data: { isDeleted: true, deletedAt: new Date(), deletedBy }
				})
			},
			async restore(this: any, where: any) {
				return this.update({
					where,
					data: { isDeleted: false, deletedAt: null, deletedBy: null }
				})
			},
			// Bỏ filter mặc định (dùng cờ __withDeleted nội bộ)
			async findManyWithDeleted(this: any, args: any = {}) {
				return this.findMany({ ...(args ?? {}), __withDeleted: true })
			}
		}
	}
})
