# Tóm tắt sửa lỗi Backend - Mediation Evidence API

## Vấn đề đã xác định ✅
- **Lỗi 422**: "Invalid input: expected string, received undefined" cho `disputeId`
- **Nguyên nhân**: Controller `listMediationEvidenceSubmissions` đang parse `req.query` nhưng `disputeId` nằm trong `req.params`

## Đã sửa ✅

### 1. Controller mediation-evidence.controller.ts
**Function**: `listMediationEvidenceSubmissions`

**Trước khi sửa**:
```typescript
const query = MediationEvidenceQuerySchema.parse(req.query)
```

**Sau khi sửa**:
```typescript
const { disputeId } = req.params
if (!disputeId) {
    throw new BadRequestException('Missing disputeId', ErrorCode.PARAM_QUERY_ERROR)
}

// Merge params and query
const queryData = {
    ...req.query,
    disputeId
}

const query = MediationEvidenceQuerySchema.parse(queryData)
```

### 2. URL Structure đã xác nhận ✅
- **Backend**: `app.use('/api', rootRouter)` trong `index.ts`
- **Frontend**: `ROOT_URL = 'http://localhost:3000/api'` trong environment
- **URL cuối cùng**: `http://localhost:3000/api/mediation-evidence/disputes/{disputeId}/evidence`

## Cần làm để hoàn thành

### 1. Restart Backend 🔄
```bash
cd lvtn_be
# Stop current process (Ctrl+C)
npm run dev
```

### 2. Test API 🧪
Sau khi restart, test endpoint:
```bash
curl -X GET "http://localhost:3000/api/mediation-evidence/disputes/DISPUTE_ID/evidence" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Kiểm tra Database Migration 🔄
Đảm bảo đã chạy migration:
```bash
cd lvtn_be
npx prisma migrate dev --name add-mediation-evidence
npx prisma generate
```

## Kết quả mong đợi

Sau khi restart backend:
- ✅ Không còn lỗi 422 "disputeId undefined"
- ✅ API trả về danh sách evidence submissions
- ✅ Frontend hiển thị tab "Hồ sơ & chứng cứ" bình thường
- ✅ Có thể nộp bằng chứng và xem đề xuất hòa giải

## Debug nếu vẫn lỗi

1. **Kiểm tra backend logs** xem có lỗi gì khác
2. **Xem Network tab** trong DevTools để kiểm tra request/response
3. **Kiểm tra database** có tables mediation mới chưa
4. **Test trực tiếp API** bằng curl hoặc Postman

Backend đã được sửa và sẵn sàng hoạt động! 🎉