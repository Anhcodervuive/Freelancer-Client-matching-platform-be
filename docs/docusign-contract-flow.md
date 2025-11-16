# Quy Trình Ký Hợp Đồng Qua DocuSign

Tài liệu này mô tả chi tiết cách nền tảng tích hợp DocuSign để phát hành và thu thập chữ ký điện tử cho hợp đồng giữa client và freelancer. Quy trình tập trung vào việc đảm bảo snapshot điều khoản nền tảng được ký hợp lệ, theo dõi trạng thái ký, và lưu bằng chứng pháp lý đầy đủ.

## 1. Chuẩn Bị

| Thành phần | Mô tả |
| --- | --- |
| **Tài khoản DocuSign** | Dùng môi trường developer (`demo.docusign.net`). Thu thập `API Account ID`, `User ID`, `Account Base URI`. |
| **Integration Key** | Tạo một ứng dụng trong mục **Apps and Keys**; lưu `Integration Key` và upload public key RSA để sử dụng OAuth JWT. |
| **Private Key** | Sinh private key RSA và lưu trong KMS/HSM hoặc secret manager (không commit vào repo). Backend dùng key này để ký JWT khi lấy access token. |
| **Webhook Secret (DocuSign Connect)** | Nếu dùng Connect để nhận callback, cấu hình một HMAC secret và endpoint tiếp nhận sự kiện. |
| **Template (tuỳ chọn)** | Nếu hợp đồng có layout cố định, tạo template DocuSign với các tabs (chữ ký, checkbox, text) sẵn. |

## 2. Dữ Liệu Hợp Đồng Chuẩn Bị Ở Backend

1. **Snapshot điều khoản**: Lấy `platformTermsSnapshot` và thông tin hợp đồng (title, giá trị, các bên tham gia).
2. **Tạo tài liệu**: Render snapshot điều khoản + thông tin hợp đồng thành PDF/HTML canonical để gửi sang DocuSign (có thể dùng template + tabs dữ liệu).
3. **Xác định bên ký**:
   * Recipient 1: Freelancer (Role `FreelancerSigner`).
   * Recipient 2: Client (Role `ClientSigner`).
   * Recipient 3 (tuỳ chọn): Đại diện nền tảng hoặc admin (Role `PlatformCounterSigner`).
4. **Thiết lập tabs**:
   * `SignHere` cho từng bên.
   * Checkbox “Tôi xác nhận đã đọc điều khoản nền tảng phiên bản …” (mapped với snapshot).
   * Text/Date tab hiển thị timestamp hoặc mã hợp đồng.
5. **Metadata nội bộ**: Chuẩn bị `contractId`, `termsVersion` để nhúng vào `customFields` giúp truy ngược khi nhận webhook.

## 3. Tạo Envelope & Gửi Cho Các Bên

1. Backend gọi DocuSign JWT OAuth để lấy access token (`POST /oauth/token`).
2. Gửi yêu cầu `POST /v2.1/accounts/{accountId}/envelopes` với payload:
   * `emailSubject`, `emailBlurb` tùy chỉnh.
   * `documents`: danh sách tài liệu PDF/HTML đã render hoặc tham chiếu template.
   * `recipients.signers`: thông tin từng bên (name, email, routing order).
   * `customFields.textTabs`: nhúng `contractId`, `termsVersion`.
   * `status`: `sent` để gửi ngay (hoặc `created` nếu muốn xem lại trong DocuSign).
3. Lưu `envelopeId` vào bảng hợp đồng để đồng bộ trạng thái.

## 4. Dòng Chảy Ký Từng Bên

| Bước | Freelancer | Client | Nền tảng |
| --- | --- | --- | --- |
| 1 | Nhận email DocuSign, mở tài liệu. | Chưa được mời (routing order = 2). | Theo dõi trạng thái từ API/webhook. |
| 2 | Xem điều khoản, tick checkbox xác nhận, ký ở vị trí `SignHere`. | Chưa được mời. | -- |
| 3 | Hoàn tất → DocuSign chuyển envelope sang người tiếp theo. | Nhận email mời ký. | Webhook/cron ghi nhận `Completed` cho Freelancer. |
| 4 | Đọc tài liệu, ký và gửi. | Hoàn tất. | -- |
| 5 | (Tuỳ chọn) Platform counter-sign | (nếu có) | (nếu có) | Nhận yêu cầu ký cuối cùng, ký để hoàn tất. |
| 6 | Envelope đạt trạng thái `completed`. | -- | Backend nhận webhook và cập nhật hợp đồng sang `SIGNED`. |

## 5. Nhận Thông Báo & Cập Nhật Hệ Thống

1. **Webhook (DocuSign Connect)**: cấu hình endpoint `POST /webhooks/docusign` nhận sự kiện `EnvelopeCompleted`, `RecipientCompleted`.
   * Xác thực HMAC bằng secret.
   * Parse `envelopeId`, `status`, `recipientEvents`.
2. **Polling dự phòng**: nếu webhook thất bại, cron gọi `GET /v2.1/accounts/{accountId}/envelopes/{envelopeId}` để lấy trạng thái.
3. **Cập nhật DB**:
   * Lưu timestamp ký của từng bên (`freelancerSignedAt`, `clientSignedAt`, `platformSignedAt`).
   * Lưu URL tài liệu hoàn tất (`GET .../documents/combined`).
   * Gắn hash SHA256 của file cuối cùng vào bảng `Contract` để phục vụ kiểm chứng.
4. **Kích hoạt nghiệp vụ**: khi cả hai bên ký xong → đánh dấu hợp đồng `ACTIVE`, cho phép mở milestone, release thanh toán, mở tranh chấp theo điều khoản mới ký.

## 6. Lưu Trữ Bằng Chứng

* Tải bản PDF hoàn tất (DocuSign cung cấp Certificate of Completion) và lưu vào storage an toàn (S3 bucket riêng, quyền truy cập hạn chế).
* Lưu metadata: `envelopeId`, `certificateUrl`, hash SHA256, ngày ký, phiên bản điều khoản.
* Gửi email cho mỗi bên kèm bản PDF và certificate.

## 7. Xử Lý Thất Bại & Thu Hồi

* Nếu một bên từ chối ký (`Decline`), webhook trả về `status = declined`. Backend ghi nhận và chuyển hợp đồng về `REJECTED`, đồng thời thông báo cho admin.
* Có thể gửi lại envelope bằng `POST /envelopes/{envelopeId}/views/recipient` hoặc tạo envelope mới với phiên bản điều khoản cập nhật.
* Nếu cần hủy (`void`), gọi `PUT /envelopes/{envelopeId}` với `status = voided` và lý do; ghi log để audit.

## 8. Kiểm Soát Quyền Truy Cập

* Chỉ backend service account sử dụng Integration Key/Private Key. Không nhúng key vào frontend.
* Sử dụng OAuth JWT flow với `impersonatedUserGuid = User ID` từ DocuSign (xem trong màn hình Apps & Keys giống hình chụp).
* Giới hạn IP/Firewall cho webhook endpoint.

## 9. Kiểm Tra & UAT

1. Tạo hợp đồng thử, xác nhận envelope được tạo trong tab **Manage** của DocuSign sandbox.
2. Dùng hai email khác nhau đại diện cho client và freelancer để mô phỏng quy trình ký.
3. Kiểm tra backend nhận đủ webhook và cập nhật trạng thái.
4. So sánh hash tài liệu trước và sau khi tải về để đảm bảo tính toàn vẹn.
5. Xuất báo cáo audit: `contractId`, `envelopeId`, thời điểm ký từng bên, IP/UA (DocuSign certificate cung cấp).

## 10. Chuyển Sản Xuất

* Hoàn tất quy trình `Go-Live` của DocuSign để chuyển Integration Key sang môi trường production.
* Cập nhật `basePath` API và accountId tương ứng.
* Kiểm tra compliance (ESIGN/UETA, eIDAS) theo khu vực kinh doanh.
* Thiết lập backup/retention cho tài liệu ký.

Tài liệu này nên được giữ cùng với kiến trúc điều khoản nền tảng để đội phát triển và vận hành có thể tham chiếu khi tích hợp DocuSign vào luồng hợp đồng hai bên.
