/**
 * Script để cập nhật payerId cho các Payment cũ không có payerId
 * 
 * Chạy: npx ts-node scripts/fix-payment-payer-id.ts
 */

import { PrismaClient, PaymentType, Role } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Bắt đầu cập nhật payerId cho Payment...')

  // Lấy tất cả Payment không có payerId
  const paymentsWithoutPayer = await prisma.payment.findMany({
    where: {
      payerId: null
    },
    include: {
      escrow: {
        include: {
          milestone: {
            include: {
              contract: true
            }
          }
        }
      }
    }
  })

  console.log(`📊 Tìm thấy ${paymentsWithoutPayer.length} Payment không có payerId`)

  let updatedCount = 0
  let skippedCount = 0

  for (const payment of paymentsWithoutPayer) {
    // Chỉ xử lý Payment có escrow (milestone payment)
    if (payment.escrow?.milestone?.contract) {
      const contract = payment.escrow.milestone.contract
      
      // Client là người trả tiền cho milestone
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          payerId: contract.clientId,
          payerRole: Role.CLIENT
        }
      })
      
      updatedCount++
      console.log(`✅ Cập nhật Payment ${payment.id} -> payerId: ${contract.clientId}`)
    } else {
      skippedCount++
      console.log(`⏭️ Bỏ qua Payment ${payment.id} (không có escrow/milestone)`)
    }
  }

  console.log('\n📈 Kết quả:')
  console.log(`   - Đã cập nhật: ${updatedCount}`)
  console.log(`   - Bỏ qua: ${skippedCount}`)
  console.log('✨ Hoàn tất!')
}

main()
  .catch(e => {
    console.error('❌ Lỗi:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
