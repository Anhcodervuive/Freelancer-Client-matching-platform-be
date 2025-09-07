import Stripe from 'stripe'
import type StripeNS from 'stripe'
import { STRIPE_CONFIG_INFO } from '~/config/environment'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'

const stripe = new Stripe(STRIPE_CONFIG_INFO.API_KEY!) //

/** Lấy/ tạo Stripe Customer cho profileId (profileId == userId theo schema của bạn) */
/** Đảm bảo mỗi user có đúng 1 Stripe Customer và LƯU vào Profile */
async function ensureStripeCustomer(userId: string): Promise<string> {
	// Luôn đọc profile trước
	const profile = await prismaClient.profile.findUnique({
		where: { userId },
		select: { userId: true, firstName: true, lastName: true, stripeCustomerId: true }
	})
	if (!profile) throw new Error('Profile not found')

	// Đã có -> dùng luôn
	if (profile.stripeCustomerId) return profile.stripeCustomerId

	// Thử tìm trên Stripe (trường hợp trước đây đã lỡ tạo)
	const found = await stripe.customers.search({
		// ĐÃ set metadata.userId khi tạo trước đó
		query: `metadata['userId']:'${profile.userId}'`
	})
	let customerId: string
	if (found.data.length > 0) {
		customerId = found.data[0]!.id
	} else {
		// Tạo mới 1 lần, dùng idempotency theo userId cho chắc
		const created = await stripe.customers.create(
			{
				name: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
				metadata: { userId: profile.userId }
			},
			{ idempotencyKey: `cust_${profile.userId}` }
		)
		customerId = created.id
	}

	// Ghi lại vào DB để các lần sau KHÔNG tạo trùng nữa
	await prismaClient.profile.update({
		where: { userId: profile.userId },
		data: { stripeCustomerId: customerId }
	})

	return customerId
}

async function createSetupIntentForUser(
	userId: string,
	options?: { usage?: 'on_session' | 'off_session'; paymentMethodTypes?: string[]; metadata?: Record<string, string> }
) {
	const stripeCustomerId = await ensureStripeCustomer(userId)

	const si = await stripe.setupIntents.create({
		customer: stripeCustomerId,
		usage: options?.usage ?? 'off_session',
		payment_method_types: options?.paymentMethodTypes ?? ['card'],
		metadata: { profileId: userId, ...options?.metadata }
	})
	return {
		clientSecret: si.client_secret,
		setupIntentId: si.id,
		customerId: stripeCustomerId
	}
}
/** Đồng bộ default payment method trên Stripe Customer */
async function setStripeCustomerDefaultPaymentMethod(stripeCustomerId: string, paymentMethodId: string) {
	await stripe.customers.update(stripeCustomerId, {
		invoice_settings: { default_payment_method: paymentMethodId }
	})
}

/** Tạo/đính kèm PM và lưu DB */
async function addPaymentMethod(profileId: string, input: any) {
	const { paymentMethodId, makeDefault } = input
	const stripeCustomerId = await ensureStripeCustomer(profileId)

	// Lấy PM hiện có
	const pmCurrent = (await stripe.paymentMethods.retrieve(paymentMethodId)) as StripeNS.Response<StripeNS.PaymentMethod>
	const pmCustomerId = typeof pmCurrent.customer === 'string' ? pmCurrent.customer : pmCurrent.customer?.id || null

	let pm = pmCurrent

	if (pmCustomerId && pmCustomerId !== stripeCustomerId) {
		// PM đang gắn với customer KHÁC -> detach rồi attach (card cho phép)
		// try {
		// 	await stripe.paymentMethods.detach(paymentMethodId)
		// 	pm = await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId })
		// } catch {
		// 	throw new Error('This payment method is already attached to another customer.')
		// }
		throw new Error('This payment method is already attached to another customer.')
	} else if (!pmCustomerId) {
		// PM chưa gắn ai -> attach
		pm = await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId })
	} // else: đã đúng customer -> dùng luôn

	const card = pm.card
	if (!card) throw new Error('Only card payment methods are supported in this endpoint.')

	if (makeDefault) {
		await stripe.customers.update(stripeCustomerId, {
			invoice_settings: { default_payment_method: paymentMethodId }
		})
	}

	// Lưu DB
	const result = await prismaClient.$transaction(async tx => {
		if (makeDefault) {
			await tx.paymentMethodRef.updateMany({
				where: { profileId, isDefault: true },
				data: { isDefault: false }
			})
		}

		const rec = await tx.paymentMethodRef.upsert({
			where: {
				stripeCustomerId_paymentMethodId: {
					stripeCustomerId,
					paymentMethodId
				}
			},
			create: {
				profileId,
				stripeCustomerId,
				paymentMethodId,
				brand: card.brand ?? null,
				last4: card.last4 ?? null,
				expMonth: card.exp_month ?? null,
				expYear: card.exp_year ?? null,
				isDefault: makeDefault ?? false,
				firstName: pm.billing_details?.name?.split(' ')[0] ?? '',
				lastName: pm.billing_details?.name?.split(' ').slice(1).join(' ') ?? '',
				billingCountry: pm.billing_details.address?.country ?? null,
				billingCity: pm.billing_details.address?.city ?? null,
				billingLine1: pm.billing_details.address?.line1 ?? null,
				billingLine2: pm.billing_details.address?.line2 ?? null,
				billingPostal: pm.billing_details.address?.postal_code ?? null
			},
			update: {
				brand: card.brand ?? null,
				last4: card.last4 ?? null,
				expMonth: card.exp_month ?? null,
				expYear: card.exp_year ?? null,
				isDefault: makeDefault ?? false,
				firstName: pm.billing_details?.name?.split(' ')[0] ?? '',
				lastName: pm.billing_details?.name?.split(' ').slice(1).join(' ') ?? ''
			}
		})

		return rec
	})

	return {
		id: result.id,
		profileId: result.profileId,
		stripeCustomerId,
		paymentMethodId,
		brand: result.brand,
		last4: result.last4,
		expMonth: result.expMonth,
		expYear: result.expYear,
		isDefault: result.isDefault
	}
}

/** Đặt default cho 1 PM đã có (DB + Stripe) */
async function setDefaultPaymentMethod(profileId: string, pmId: string) {
	const pm = await prismaClient.paymentMethodRef.findFirst({
		where: { id: pmId, profileId }
	})
	if (!pm) throw new Error('Payment method not found')

	await setStripeCustomerDefaultPaymentMethod(pm.stripeCustomerId, pm.paymentMethodId)

	await prismaClient.$transaction(async tx => {
		await tx.paymentMethodRef.updateMany({
			where: { profileId, isDefault: true },
			data: { isDefault: false }
		})
		await tx.paymentMethodRef.update({
			where: { id: pmId },
			data: { isDefault: true }
		})
	})

	return { ok: true }
}

async function getPaymentMethodById(pmId: string) {
	return prismaClient.paymentMethodRef.findUnique({
		where: {
			id: pmId
		}
	})
}

async function updatePaymentMethod(pmId: string, data: any) {
	const existedPm = await prismaClient.paymentMethodRef.findUnique({
		where: { id: pmId }
	})

	if (!existedPm) {
		throw new BadRequestException('No payment method found', ErrorCode.PAYMENT_METHOD_NOT_FOUNT)
	}

	await stripe.paymentMethods.update(existedPm.paymentMethodId, {
		billing_details: {
			name: `${data.firstName} ${data.lastName}`.trim(),
			address: {
				country: data.billingCountry || undefined,
				city: data.billingCity || undefined,
				line1: data.billingLine1 || undefined,
				line2: data.billingLine2 || undefined,
				postal_code: data.billingPostal || undefined
			}
		}
	})

	const updatedPm = await prismaClient.paymentMethodRef.update({
		where: { id: pmId },
		data: {
			...data
		}
	})

	return updatedPm
}

const getAllByUserId = async (userId: string) => {
	return prismaClient.paymentMethodRef.findMany({
		where: { profileId: userId },
		orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
	})
}

/** Xoá PM (detach Stripe + xoá DB). Không cho xoá nếu đang default và còn PM khác chưa default. */
async function removePaymentMethod(profileId: string, pmId: string) {
	const rec = await prismaClient.paymentMethodRef.findFirst({
		where: { id: pmId, profileId }
	})
	if (!rec) throw new BadRequestException('Payment method not found', ErrorCode.PAYMENT_METHOD_NOT_FOUNT)

	// Detach khỏi Stripe (không xoá được PM nếu nó đang dùng cho subscription… tuỳ trường hợp Stripe)
	await stripe.paymentMethods.detach(rec.paymentMethodId)

	await prismaClient.paymentMethodRef.delete({ where: { id: pmId } })
	return { ok: true }
}

export default {
	getAllByUserId,
	setStripeCustomerDefaultPaymentMethod,
	addPaymentMethod,
	getPaymentMethodById,
	updatePaymentMethod,
	removePaymentMethod,
	setDefaultPaymentMethod,
	createSetupIntentForUser
}
