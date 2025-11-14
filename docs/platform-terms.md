# Thiết Kế Chức Năng Điều Khoản Nền Tảng

Tài liệu này phác thảo cách triển khai chức năng điều khoản nền tảng (Platform Terms) để hỗ trợ hợp đồng điện tử cho marketplace freelancer. Thiết kế hướng đến việc lưu trữ nội dung điều khoản theo phiên bản, ghi nhận sự đồng ý của các bên, và tích hợp với các quy trình nghiệp vụ như tạo hợp đồng, quản lý milestone, xử lý tranh chấp.

## 1. Mục tiêu

* Đảm bảo mỗi hợp đồng lưu snapshot điều khoản nền tảng mà freelancer và client đã đồng ý.
* Cho phép cập nhật điều khoản nền tảng có kiểm soát và giữ lịch sử phiên bản.
* Ghi nhận bằng chứng pháp lý (thời gian, người chấp thuận, thiết bị) khi người dùng đồng ý.
* Tích hợp điều khoản vào các quy trình liên quan (tạo hợp đồng, mở milestone, khởi tạo tranh chấp, thanh toán).

## 2. Kiến trúc dữ liệu

### 2.1 Bảng `PlatformTerms`

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `id` | UUID | Định danh phiên bản điều khoản. |
| `version` | String | Tên phiên bản (ví dụ `2024-05`). |
| `title` | String | Tiêu đề điều khoản. |
| `body` | JSON/Text | Nội dung điều khoản (có thể cấu trúc theo section). |
| `effectiveFrom` | DateTime | Ngày hiệu lực. |
| `effectiveTo` | DateTime? | Ngày kết thúc hiệu lực (nếu được thay thế). |
| `status` | Enum | `DRAFT`, `ACTIVE`, `RETIRED`. |
| `createdById` | UUID | Admin tạo phiên bản. |
| `createdAt` / `updatedAt` | DateTime | Dấu thời gian tạo/cập nhật. |

### 2.2 Bảng `Contract`

Bổ sung các trường mới:

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `platformTermsVersion` | String | Phiên bản điều khoản áp dụng cho hợp đồng. |
| `platformTermsSnapshot` | JSON/Text | Bản chụp toàn văn điều khoản tại thời điểm ký. |
| `termsAcceptedAt` | DateTime | Thời điểm freelancer chấp thuận điều khoản. |
| `termsAcceptedById` | UUID | Người dùng đã chấp thuận (freelancer). |
| `termsAcceptedIp` | String | Địa chỉ IP khi chấp thuận. |
| `clientAcceptedAt` | DateTime? | Thời điểm client đồng ý (nếu yêu cầu). |
| `clientAcceptedIp` | String? | Địa chỉ IP của client. |

### 2.3 Bảng `ContractAcceptanceLog`

Lưu lịch sử chấp thuận để phục vụ audit (tùy chọn).

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `id` | UUID | Định danh log. |
| `contractId` | UUID | Tham chiếu hợp đồng. |
| `actorId` | UUID | Người thực hiện hành động. |
| `termsVersion` | String | Phiên bản điều khoản được chấp thuận. |
| `acceptedAt` | DateTime | Thời điểm diễn ra. |
| `ipAddress` / `userAgent` | String | Thông tin thiết bị. |
| `action` | Enum | `ACCEPTED`, `DECLINED`, `REVOKED`. |

### 2.4 Cấu trúc nội dung điều khoản

Để đáp ứng nhu cầu mở rộng số lượng nhóm điều khoản (ví dụ làm việc, tranh chấp, thanh toán, tích hợp Stripe, bảo mật dữ
liệu...), nên lưu `body` theo cấu trúc có định danh từng section thay vì một block văn bản lớn. Một cấu trúc tham khảo:

```json
{
  "sections": [
    {
      "code": "work",
      "title": "Điều khoản làm việc",
      "body": "...",
      "version": "v1"
    },
    {
      "code": "dispute",
      "title": "Điều khoản tranh chấp",
      "body": "...",
      "version": "v2"
    },
    {
      "code": "payment",
      "title": "Thanh toán & Stripe",
      "body": "...",
      "metadata": { "provider": "stripe", "country": "SG" }
    }
  ]
}
```

Thiết kế này cho phép:

* Thêm mới section mà không ảnh hưởng các section khác; admin UI có thể hỗ trợ bật/tắt hoặc thay đổi thứ tự hiển thị.
* Tái sử dụng section chung cho nhiều phiên bản thông qua `code`/`version`, hoặc tách bảng con `PlatformTermsSection` nếu cần
  quản lý vòng đời độc lập.
* Phục vụ API/UI lọc và render từng nhóm điều khoản (ví dụ chỉ hiển thị phần "Thanh toán" trong wizard kết nối Stripe).

#### Mức độ phổ biến của cấu trúc theo section

* Các marketplace lớn (Upwork, Fiverr, Deel…) công bố điều khoản theo từng nhóm chủ đề như "Payment Terms", "Dispute Resolution",
  "Connected Accounts" để tái sử dụng nội dung ở nhiều luồng nghiệp vụ, nên backend thường quản lý nội dung dạng section thay vì
  một block text duy nhất.
* Nền tảng tích hợp nhiều cổng thanh toán sử dụng mã định danh section (`code`, `version`) để bật/tắt nội dung theo provider hoặc
  quốc gia; cách tổ chức này cho phép render đúng phần Stripe, Payoneer… mà vẫn giữ lịch sử phiên bản.
* Với sản phẩm phải hỗ trợ đa ngôn ngữ, điều khoản chia theo section giúp ánh xạ bản dịch dễ dàng và kiểm soát diff khi cập nhật.
* Snapshot JSON theo section giúp backend chọn lọc nội dung, ghép template PDF/HTML và ký số tạo bằng chứng điện tử mà không cần
  thao tác thủ công trên văn bản tự do.

## 3. Quy trình nghiệp vụ

### 3.1 Khởi tạo hợp đồng

1. Khi client gửi offer hoặc chấp nhận proposal, backend lấy phiên bản điều khoản `ACTIVE` mới nhất.
2. Hệ thống gắn `platformTermsVersion` và snapshot nội dung vào bản ghi hợp đồng ở trạng thái `PENDING_ACCEPTANCE`.
3. UI hiển thị nội dung điều khoản cho freelancer (và client nếu cần) trước khi họ nhấn "Đồng ý".

### 3.2 Ghi nhận chấp thuận

1. Freelancer nhấn "Đồng ý điều khoản" → backend kiểm tra hợp lệ và ghi lại `termsAcceptedAt`, `termsAcceptedById`, `termsAcceptedIp`.
2. Nếu yêu cầu client đồng ý, quy trình tương tự với `clientAcceptedAt`.
3. Ghi bản ghi vào `ContractAcceptanceLog` để lưu dấu vết.
4. Sau khi cả hai bên hoàn tất, hợp đồng chuyển sang trạng thái `ACTIVE` và mở milestone đầu tiên (nếu có).

### 3.3 Cập nhật điều khoản nền tảng

1. Admin tạo phiên bản mới trong bảng `PlatformTerms` với trạng thái `DRAFT` và soạn nội dung.
2. Sau khi duyệt, chuyển sang `ACTIVE` và đặt `effectiveFrom`.
3. Các hợp đồng mới tạo sẽ sử dụng phiên bản mới; hợp đồng đang hoạt động vẫn giữ snapshot cũ.
4. Nếu bắt buộc áp dụng điều khoản mới cho hợp đồng đang mở, cần workflow yêu cầu hai bên tái xác nhận (tạo log mới, cập nhật timestamp).

### 3.4 Tích hợp với tranh chấp và thanh toán

* Khi mở tranh chấp, API trả về `platformTermsSnapshot` để admin đánh giá.
* Nếu escalated ra ngoài, hệ thống có thể xuất PDF chứa snapshot và log chấp thuận.
* Trước khi giải ngân milestone, backend xác thực hợp đồng đã có `termsAcceptedAt`. Nếu chưa, chặn thao tác và yêu cầu hoàn tất bước chấp thuận.

## 4. API và Serializer

### 4.1 Endpoint quản lý điều khoản (Admin)

* `POST /admin/platform-terms` – tạo phiên bản mới.
* `PATCH /admin/platform-terms/:id` – cập nhật nội dung hoặc trạng thái.
* `GET /admin/platform-terms` – danh sách phiên bản.
* `GET /admin/platform-terms/:id` – chi tiết bao gồm lịch sử chỉnh sửa.

### 4.2 Endpoint public

* `GET /platform-terms/latest` – trả về phiên bản `ACTIVE` mới nhất để client hiển thị.
* `GET /platform-terms/:version` – tra cứu lịch sử điều khoản.

### 4.3 Serializer hợp đồng (`ContractService`)

Mở rộng payload trả về:

```json
{
  "id": "...",
  "status": "ACTIVE",
  "platformTerms": {
    "version": "2024-05",
    "acceptedAt": "2024-05-02T09:30:00Z",
    "acceptedBy": { "id": "...", "displayName": "..." },
    "clientAcceptedAt": null,
    "snapshot": {
      "sections": [
        { "title": "Thanh toán", "body": "..." },
        { "title": "Tranh chấp", "body": "..." }
      ]
    }
  },
  "milestones": [...]
}
```

## 5. UI/UX đề xuất

* **Bước accept hợp đồng:** hiển thị điều khoản dạng accordion/section kèm checkbox xác nhận "Tôi đã đọc và đồng ý". Bắt buộc tick trước khi enable nút Accept.
* **Trang hợp đồng:** có tab "Điều khoản" hiển thị snapshot và trạng thái chấp thuận của từng bên.
* **Thông báo:** gửi email chứa bản PDF hoặc link đến snapshot sau khi hợp đồng được kích hoạt.
* **Lịch sử thay đổi:** admin dashboard hiển thị timeline các phiên bản và ai đã xuất bản.

## 6. Bảo mật và pháp lý

* **Bằng chứng điện tử:** lưu IP, user-agent, timestamp theo chuẩn UTC. Nếu cần, ký số snapshot bằng private key hoặc sử dụng dịch vụ timestamp.
* **Tuân thủ dữ liệu:** hạn chế truy cập vào bảng snapshot thông qua RBAC; mã hóa dữ liệu nhạy cảm nếu chứa thông tin cá nhân.
* **Sao lưu:** định kỳ backup bảng `PlatformTerms` và `Contract` để đảm bảo khả năng khôi phục.
* **Chữ ký số & chứng thư số:**
  * Triển khai cơ chế ký số (digital signature) trên snapshot điều khoản/hợp đồng để đảm bảo tài liệu không thể bị chỉnh sửa mà không bị phát hiện. Một quy trình phổ biến:
    1. Tạo file PDF/JSON chuẩn hóa từ `platformTermsSnapshot` và metadata chấp thuận.
    2. Tính hash (SHA-256) của file, ký hash bằng private key thuộc chứng thư số của nền tảng hoặc nhà cung cấp e-sign (ví dụ DocuSign, Adobe Sign).
    3. Lưu chữ ký (`signature`), chứng thư (`certificate`) và thuật toán (`alg`) vào bảng hợp đồng; file ký số được đính kèm khi xuất hồ sơ tranh chấp.
    4. Khi cần đối chứng, dùng public key trong chứng thư để verify chữ ký và đối chiếu hash nhằm chứng minh tài liệu không bị sửa.
  * Nếu tích hợp nhà cung cấp e-sign, lưu cả mã giao dịch (envelope ID), trạng thái ký và audit trail mà họ trả về. Điều này giúp tuân thủ chuẩn eIDAS, UETA/ESIGN tại các thị trường lớn.
  * Đối với chữ ký số nội bộ, bảo vệ private key bằng HSM/KMS, giới hạn quyền truy cập và xoay vòng định kỳ. Lưu log mỗi lần ký để đảm bảo khả năng truy vết.

## 7. Lộ trình triển khai gợi ý

1. Thiết kế schema database và migration cho `PlatformTerms`, các trường mới ở `Contract`, và `ContractAcceptanceLog`.
2. Cập nhật layer repository/service để hỗ trợ đọc/ghi điều khoản và log chấp thuận.
3. Bổ sung endpoint admin/public và cập nhật serializer hợp đồng.
4. Cập nhật frontend hiển thị điều khoản và bắt buộc tick đồng ý trước khi active hợp đồng.
5. Tích hợp điều khoản vào quy trình tranh chấp và xuất hồ sơ.
6. Viết test cho luồng accept contract, đảm bảo dữ liệu log/snapshot được lưu chính xác.

Thiết kế này đảm bảo hệ thống đáp ứng yêu cầu hợp đồng điện tử: điều khoản được chốt theo phiên bản, có bằng chứng người dùng đã chấp thuận, và dễ dàng truy xuất khi xảy ra tranh chấp.
