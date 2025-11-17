# Mẫu Điều Khoản Nền Tảng

Tài liệu này cung cấp một số mẫu dữ liệu `PlatformTerms` để bạn có thể nhập vào cơ sở dữ liệu (ví dụ thông qua Prisma
Studio, script seed hoặc migration thủ công). Các mẫu được viết theo cấu trúc section đã mô tả trong tài liệu thiết kế và
bao gồm những nhóm điều khoản phổ biến hiện có: làm việc, tranh chấp, thanh toán, tích hợp Stripe và bảo mật dữ liệu.

## 1. Phiên bản đang hiệu lực (ACTIVE)

```json
{
  "version": "2024-07",
  "title": "Điều khoản nền tảng – Bản 2024-07",
  "status": "ACTIVE",
  "effectiveFrom": "2024-07-01T00:00:00.000Z",
  "effectiveTo": null,
  "body": {
    "sections": [
      {
        "code": "work",
        "title": "Điều khoản làm việc",
        "body": "Freelancer cam kết hoàn thành deliverable theo mô tả công việc. Các bên phải trao đổi thông qua hệ thống chat của nền tảng. Mọi cập nhật phạm vi cần được xác nhận lại bằng văn bản trong hệ thống.",
        "version": "v1"
      },
      {
        "code": "dispute",
        "title": "Điều khoản tranh chấp",
        "body": "Nền tảng hỗ trợ hòa giải nội bộ trong vòng 7 ngày làm việc kể từ khi tranh chấp được mở. Nếu hai bên không đạt thỏa thuận, hồ sơ sẽ được chuyển cho cơ quan tài phán mà hợp đồng đã thống nhất (ví dụ Tòa án/Trọng tài Singapore).",
        "version": "v1",
        "metadata": {
          "mediationWindowDays": 7,
          "escalationChannel": "external-authority"
        }
      },
      {
        "code": "payment",
        "title": "Điều khoản thanh toán",
        "body": "Client phải nạp đủ giá trị milestone trước khi freelancer bắt đầu thực hiện. Nền tảng giữ tiền trong tài khoản ký quỹ và chỉ giải ngân khi milestone được xác nhận hoàn tất. Phí dịch vụ 10% sẽ được khấu trừ trước khi giải ngân.",
        "version": "v2",
        "metadata": {
          "escrow": true,
          "serviceFeePercent": 10
        }
      },
      {
        "code": "payment-stripe",
        "title": "Thanh toán qua Stripe",
        "body": "Mọi giao dịch sử dụng Stripe phải tuân thủ Điều khoản Dịch vụ của Stripe. Người dùng đồng ý cho phép nền tảng khởi tạo Payment Intent để thu và hoàn trả tiền theo tiến độ milestone. Stripe có thể yêu cầu xác minh danh tính bổ sung theo khu vực.",
        "version": "v1",
        "metadata": {
          "provider": "stripe",
          "settlementCurrency": "USD"
        }
      },
      {
        "code": "privacy",
        "title": "Bảo mật dữ liệu",
        "body": "Thông tin cá nhân chỉ được sử dụng cho mục đích thực hiện hợp đồng. Nền tảng tuân thủ các quy định bảo vệ dữ liệu hiện hành (ví dụ GDPR) và chỉ chia sẻ thông tin với bên thứ ba khi có sự đồng ý của người dùng hoặc yêu cầu pháp lý.",
        "version": "v1"
      }
    ]
  }
}
```

## 2. Phiên bản dự thảo (DRAFT)

```json
{
  "version": "2024-08-draft",
  "title": "Điều khoản nền tảng – Bản DRAFT 2024-08",
  "status": "DRAFT",
  "effectiveFrom": "2024-08-15T00:00:00.000Z",
  "effectiveTo": null,
  "body": {
    "sections": [
      {
        "code": "work",
        "title": "Điều khoản làm việc (cập nhật)",
        "body": "Freelancer phải cập nhật tiến độ tối thiểu 2 lần/tuần. Client cần phản hồi trong vòng 48 giờ để tránh làm chậm milestone.",
        "version": "v2",
        "metadata": {
          "progressUpdateIntervalHours": 84,
          "clientResponseSlaHours": 48
        }
      },
      {
        "code": "dispute",
        "title": "Điều khoản tranh chấp (cập nhật)",
        "body": "Thời gian hòa giải nội bộ mở rộng lên 10 ngày. Nếu cần chuyển cho cơ quan ngoài, nền tảng sẽ cung cấp toàn bộ log liên quan và bản chụp điều khoản mà hai bên đã đồng ý.",
        "version": "v2",
        "metadata": {
          "mediationWindowDays": 10,
          "escalationChannel": "external-authority"
        }
      },
      {
        "code": "payment",
        "title": "Điều khoản thanh toán (cập nhật)",
        "body": "Phí dịch vụ được tính theo bậc: 10% cho phần giá trị dưới 1.000 USD và 7% cho phần vượt quá. Nền tảng có quyền yêu cầu hoàn trả nếu phát hiện gian lận.",
        "version": "v3",
        "metadata": {
          "serviceFeeTiers": [
            { "threshold": 1000, "percent": 10 },
            { "threshold": null, "percent": 7 }
          ]
        }
      },
      {
        "code": "payment-stripe",
        "title": "Thanh toán qua Stripe (cập nhật)",
        "body": "Người dùng phải hoàn tất quy trình KYC của Stripe. Các khoản thanh toán bằng EUR sẽ được chuyển đổi sang USD theo tỷ giá tại thời điểm giải ngân và có thể phát sinh phí chuyển đổi.",
        "version": "v2",
        "metadata": {
          "provider": "stripe",
          "settlementCurrency": "USD",
          "fxFeePercent": 2.5
        }
      },
      {
        "code": "privacy",
        "title": "Bảo mật dữ liệu (cập nhật)",
        "body": "Người dùng có thể yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân thông qua trang cài đặt tài khoản. Yêu cầu sẽ được xử lý trong vòng 30 ngày làm việc.",
        "version": "v2",
        "metadata": {
          "dataSubjectRequestSlaDays": 30
        }
      }
    ]
  }
}
```

## 3. Gợi ý nhập liệu

1. Chèn bản ghi `ACTIVE` trước để áp dụng cho các hợp đồng hiện tại. Khi tạo hợp đồng mới, hệ thống sẽ snapshot nội dung này.
2. Giữ bản ghi `DRAFT` để chuẩn bị phát hành phiên bản tiếp theo. Khi sẵn sàng, chuyển `status` sang `ACTIVE` và cập nhật `effectiveFrom`.
3. Nếu cần thêm ngôn ngữ khác, có thể sao chép cấu trúc và bổ sung trường `locale` trong `metadata` của từng section hoặc tạo phiên bản
   riêng cho từng ngôn ngữ.
4. Khi seed dữ liệu, đảm bảo `createdById` tham chiếu tới một admin hợp lệ và cập nhật `createdAt`/`updatedAt` phù hợp.

Các mẫu trên có thể được điều chỉnh nội dung chi tiết cho phù hợp chính sách thực tế trước khi ghi vào cơ sở dữ liệu.
