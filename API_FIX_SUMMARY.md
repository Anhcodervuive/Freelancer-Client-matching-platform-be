# Tóm tắt sửa lỗi API Frontend

## Vấn đề hiện tại
Frontend gọi API mediation nhưng bị lỗi 404 - route không tồn tại.

## Đã sửa

### 1. Backend Routes ✅
- **File**: `lvtn_be/src/routes/index.ts`
- **Đã thêm**: 
  ```typescript
  rootRouter.use('/mediation-evidence', mediationEvidenceRoute)
  rootRouter.use('/mediation-proposal', mediationProposalRoute)
  ```

### 2. Mediation Proposal Route ✅
- **File**: `lvtn_be/src/routes/mediation-proposal.route.ts`
- **Đã sửa**: Import controller functions đúng cách
- **Routes có sẵn**:
  - `POST /mediation-proposal/dispute/:disputeId` - Tạo đề xuất
  - `GET /mediation-proposal/dispute/:disputeId` - Lấy danh sách đề xuất
  - `GET /mediation-proposal/:proposalId` - Lấy chi tiết đề xuất
  - `PUT /mediation-proposal/:proposalId/respond` - Phản hồi đề xuất
  - `DELETE /mediation-proposal/:proposalId` - Xóa đề xuất

### 3. Frontend API URLs ✅
- **File**: `lvtn_fe/src/apis/mediation-evidence.api.ts`
- **Đã sửa**: Base URL từ `/mediation` → `/mediation-evidence`
- **File**: `lvtn_fe/src/apis/mediation-proposal.api.ts`
- **URLs đúng**: Tất cả URLs đã khớp với backend routes

## Cần làm để hoàn thành

### 1. Restart Backend 🔄
```bash
cd lvtn_be
# Stop current process (Ctrl+C)
npm run dev
```

### 2. Chạy Database Migration 🔄
```bash
cd lvtn_be
npx prisma migrate dev --name add-mediation-evidence
npx prisma generate
```

### 3. Test API 🧪
Sau khi restart backend, test các endpoints:
- `GET /mediation-evidence/disputes/{disputeId}/evidence`
- `GET /mediation-proposal/dispute/{disputeId}`

## Kiểm tra hoạt động

1. **Mở browser DevTools**
2. **Vào trang dispute** → Tab "Hồ sơ & chứng cứ"
3. **Xem Network tab** - không còn lỗi 404
4. **Thấy giao diện mới** với 2 tab: "Bằng chứng" và "Đề xuất hòa giải"

## Nếu vẫn lỗi

1. **Kiểm tra backend logs** xem có lỗi gì
2. **Kiểm tra database** đã có tables mới chưa
3. **Xem browser console** có lỗi JavaScript nào không

## URLs cuối cùng

### Frontend gọi:
- `/mediation-evidence/disputes/{disputeId}/evidence`
- `/mediation-proposal/dispute/{disputeId}`

### Backend routes:
- `/mediation-evidence/*` → mediationEvidenceRoute
- `/mediation-proposal/*` → mediationProposalRoute

Tất cả đã được sửa và sẵn sàng hoạt động! 🎉