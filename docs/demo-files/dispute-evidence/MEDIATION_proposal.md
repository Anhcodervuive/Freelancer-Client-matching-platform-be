# MEDIATION PROPOSAL
## Dispute Resolution - Milestone 3: DRM Protection & Security

---

## 📋 DISPUTE INFORMATION

| Field | Value |
|-------|-------|
| **Dispute ID** | DSP-2024-001 |
| **Contract** | Build Online Learning Platform (LMS) |
| **Milestone** | #3 - DRM Protection & Security |
| **Amount** | $6,000 USD |
| **Client** | [Client Name] |
| **Freelancer** | [Freelancer Name] |
| **Dispute Date** | 20/12/2024 |
| **Mediator** | Admin System |

---

## 📊 PHÂN TÍCH BẰNG CHỨNG

### Issue 1: Widevine DRM
| Aspect | Client Claim | Freelancer Response | Verdict |
|--------|--------------|---------------------|---------|
| DRM Implementation | Video downloadable | Encrypted, not playable | ✅ **Freelancer đúng** |
| Evidence | Screen recording | License logs, test report | Freelancer có bằng chứng mạnh hơn |

**Kết luận:** Widevine DRM đã được implement đúng. Video download bằng extension là encrypted data, không thể play.

---

### Issue 2: Signed URLs
| Aspect | Client Claim | Freelancer Response | Verdict |
|--------|--------------|---------------------|---------|
| URL Expiration | Không expire | Expire sau 2 giờ | ✅ **Freelancer đúng** |
| IP Restriction | Không có | Không trong scope | ✅ **Freelancer đúng** |
| Evidence | Screenshot | CloudFront config | Freelancer có config proof |

**Kết luận:** Signed URLs hoạt động đúng. IP restriction không nằm trong scope ban đầu của Milestone 3.

---

### Issue 3: FairPlay DRM
| Aspect | Client Claim | Freelancer Response | Verdict |
|--------|--------------|---------------------|---------|
| Implementation | Không hoạt động | Cần certificate từ Client | ⚠️ **Pending** |
| Certificate | Không đề cập | Đã request 15/12 | Client chưa cung cấp |

**Kết luận:** FairPlay chưa implement do thiếu Apple Developer Certificate từ Client. Freelancer đã request nhưng chưa nhận được.

---

### Issue 4: Watermarking
| Aspect | Client Claim | Freelancer Response | Verdict |
|--------|--------------|---------------------|---------|
| Scope | Trong requirements | Thuộc Milestone 5 | ✅ **Freelancer đúng** |
| Evidence | Requirements doc | Milestone breakdown | Watermarking rõ ràng thuộc MS5 |

**Kết luận:** Watermarking thuộc Milestone 5 (User Management & Analytics), không phải Milestone 3.

---

### Issue 5: Documentation
| Aspect | Client Claim | Freelancer Response | Verdict |
|--------|--------------|---------------------|---------|
| Status | Không đầy đủ | Đã gửi email 18/12 | ⚠️ **Communication issue** |
| Evidence | Không có | Email proof | Freelancer có proof |

**Kết luận:** Documentation đã được gửi. Có thể có vấn đề về communication (email spam, không check).

---

## 💰 ĐỀ XUẤT PHÂN CHIA

### Phân tích công việc hoàn thành:

| Component | Status | Weight |
|-----------|--------|--------|
| Widevine DRM | ✅ Hoàn thành | 40% |
| Signed URLs | ✅ Hoàn thành | 25% |
| FairPlay DRM | ⚠️ Pending (do Client) | 20% |
| Documentation | ✅ Hoàn thành | 10% |
| Anti-piracy measures | ⚠️ Partial | 5% |

### Đề xuất phân chia:

```
┌─────────────────────────────────────────────────────┐
│           MILESTONE 3: $6,000 USD                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│   FREELANCER: 85% = $5,100                         │
│   ├── Widevine DRM: $2,400 (40%)                   │
│   ├── Signed URLs: $1,500 (25%)                    │
│   ├── Documentation: $600 (10%)                    │
│   └── Partial work: $600 (10%)                     │
│                                                     │
│   CLIENT REFUND: 15% = $900                        │
│   └── FairPlay pending: $900 (15%)                 │
│       (Will be included in next milestone)          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📋 ĐIỀU KIỆN KÈM THEO

### Freelancer phải:
1. ✅ Bổ sung documentation chi tiết hơn trong **3 ngày làm việc**
   - Thêm troubleshooting guide
   - Thêm video tutorial setup DRM

2. ✅ Implement FairPlay trong **Milestone 4** (không tính phí thêm)
   - Điều kiện: Client cung cấp certificate

3. ✅ Họp online **30 phút** để demo và training
   - Demo DRM functionality
   - Giải đáp thắc mắc

### Client phải:
1. ✅ Cung cấp Apple Developer Certificate trong **5 ngày**
   - File .cer và Private Key
   - Hoặc grant access vào Apple Developer account

2. ✅ Confirm scope watermarking thuộc Milestone 5
   - Ký xác nhận bằng văn bản

3. ✅ Check email và confirm nhận documentation
   - Reply email xác nhận

---

## ⏰ TIMELINE

| Date | Action | Responsible |
|------|--------|-------------|
| 22/12 | Proposal gửi cho 2 bên | Mediator |
| 24/12 | Deadline phản hồi proposal | Both |
| 25/12 | Freelancer bổ sung docs | Freelancer |
| 27/12 | Client cung cấp certificate | Client |
| 28/12 | Họp online demo | Both |
| 30/12 | Close dispute | Mediator |

---

## 🗳️ VOTING

### Để accept proposal này:
- **Client:** Click "Accept" và confirm điều kiện
- **Freelancer:** Click "Accept" và confirm điều kiện

### Nếu reject:
- Cung cấp lý do cụ thể
- Đề xuất phương án thay thế
- Dispute sẽ escalate lên Arbitration

---

## ⚖️ LƯU Ý PHÁP LÝ

1. Proposal này dựa trên bằng chứng từ cả hai bên
2. Quyết định cuối cùng thuộc về hai bên
3. Nếu không đồng ý, có thể yêu cầu Arbitration
4. Phí Arbitration: 5% giá trị dispute ($300)

---

## 📞 LIÊN HỆ

Nếu có thắc mắc về proposal:
- Email: mediation@platform.com
- Response time: 24 giờ

---

**Mediator:** Admin System
**Date:** 22/12/2024
**Proposal ID:** MED-2024-001
**Valid until:** 24/12/2024 23:59 UTC
