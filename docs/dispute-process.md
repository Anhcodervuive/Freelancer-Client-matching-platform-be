# Tóm tắt quy trình giải quyết tranh chấp (dispute) của Upwork

Quy trình dưới đây mô tả hành trình đầy đủ một tranh chấp hợp đồng giờ cố định (fixed-price) trên Upwork, bao gồm các mốc thời gian và yêu cầu chính đối với client lẫn freelancer.

## 1. Giai đoạn thương lượng trực tiếp (Direct Negotiation)
- **Phạm vi áp dụng**: Dispute fixed-price luôn gắn với **khoản tiền đang nằm trong escrow** của một milestone đã được fund. Nếu hợp đồng chỉ có **một milestone** (hoặc milestone cuối đã gom toàn bộ ngân sách), tranh chấp sẽ bao trùm toàn bộ hợp đồng; còn với hợp đồng nhiều milestone, mỗi milestone được xử lý độc lập.
- **Khởi tạo**: Một bên (client hoặc freelancer) nhấn "Request a refund" / "Open a dispute" trong phần hợp đồng đang escrow và điền lý do.
- **Thông báo**: Upwork gửi email/app notification cho bên còn lại, yêu cầu phản hồi trong vòng **5 ngày lịch**.
- **Trao đổi**: Hai bên sử dụng hộp thoại tranh chấp (Dispute Room) được mở ngay trên contract, kế thừa toàn bộ lịch sử chat gốc nên không cần tạo kênh mới.
- **Kết thúc giai đoạn**:
  - Nếu hai bên thống nhất, Upwork cập nhật escrow (refund hoặc release) và dispute đóng ở trạng thái **Resolved**.
  - Nếu hết hạn 5 ngày mà không phản hồi hoặc không đạt thỏa thuận, dispute chuyển sang bước tiếp theo.

## 2. Hòa giải bởi Upwork (Upwork Mediation)
- **Điều phối viên Upwork** tham gia, rà soát bằng chứng (tin nhắn, file, milestone).
- **Kênh trao đổi**: Điều phối viên vẫn trả lời ngay trong cùng phòng chat dispute. Họ có thể gửi thêm email để nhắc hạn hoặc yêu cầu cung cấp bằng chứng, nhưng không mở cuộc hội thoại riêng trừ khi cần thông tin nhạy cảm.
- Upwork đưa ra **đề xuất giải pháp** dựa trên chính sách escrow; mỗi bên có **2 ngày** để chấp nhận hoặc bác bỏ.
- Nếu cả hai bên đồng ý đề xuất => dispute đóng.
- Nếu một bên từ chối, tranh chấp tiến tới trọng tài. Cả hai bên được yêu cầu đóng phí trọng tài.

## 3. Thu phí trọng tài (Arbitration Fee Collection)
- Upwork yêu cầu **mỗi bên đóng phí 291 USD** (mức phí hiện hành có thể thay đổi) trong **4 ngày**.
- Nếu **client** không đóng phí: dispute bị đóng và toàn bộ số tiền escrow được release cho freelancer.
- Nếu **freelancer** không đóng phí: dispute bị đóng và escrow được hoàn lại cho client.
- Nếu **cả hai** không đóng phí: Upwork đóng dispute, escrow giữ nguyên trạng thái hiện tại.
- Nếu **hai bên đều đóng phí**: Upwork chuyển hồ sơ tới tổ chức trọng tài độc lập (AAA/ICDR).

### API mô phỏng bước thu phí trọng tài trong backend demo

- `POST /admin/disputes/:disputeId/request-arbitration-fees`
  - Chỉ admin mới được phép gọi.
  - Body: `{ "deadlineDays": number }` (mặc định 4 ngày, giới hạn 1–14 ngày).
  - Điều kiện: admin đã **join** tranh chấp, trạng thái hiện tại nằm trong giai đoạn hòa giải (`NEGOTIATION`).
  - Hệ thống chuyển dispute sang `AWAITING_ARBITRATION_FEES`, ghi `arbitrationDeadline = now + deadlineDays`, reset `clientArbFeePaid` & `freelancerArbFeePaid` về `false` và trả về bản tóm tắt dành cho admin.

- `POST /contracts/:contractId/milestones/:milestoneId/disputes/:disputeId/arbitration-fees/confirm`
  - Dành cho chính **client** hoặc **freelancer** của hợp đồng.
  - Body yêu cầu `{ "paymentMethodRefId": string, "idempotencyKey"?: string }` để backend tra cứu thẻ Stripe đã lưu và đảm bảo tránh bị charge trùng.
  - Khi gọi, backend tạo/khôi phục **Stripe PaymentIntent** cho khoản phí `arbFeePerParty`, xác nhận thanh toán ngay trên server và trả về `clientSecret`, `paymentIntentId`, `requiresAction`, `paymentStatus` cùng bản ghi `payment` (`type = ARBITRATION_FEE`).
  - Nếu Stripe yêu cầu 3DS/OTP, response có `requiresAction = true` và `nextAction` để front-end hoàn tất xác thực; người dùng gọi lại API với cùng `idempotencyKey` sẽ nhận được trạng thái cuối.
  - Khi thanh toán thành công, hệ thống đánh dấu `clientArbFeePaid` hoặc `freelancerArbFeePaid`; nếu cả hai đều đóng phí, dispute chuyển sang `ARBITRATION_READY` và xóa `arbitrationDeadline`.

- Các response vẫn tái sử dụng serializer dispute/timeline hiện có; front-end chỉ cần đọc thêm metadata thanh toán để hiển thị tiến trình thu phí.

## 4. Trọng tài độc lập (Binding Arbitration)
- Trọng tài viên độc lập liên hệ hai bên, yêu cầu cung cấp bằng chứng, lời khai.
- Phán quyết của trọng tài là **ràng buộc pháp lý**; Upwork điều chỉnh escrow theo quyết định cuối cùng.
- Phí trọng tài **hoàn lại cho bên thắng** (Upwork trả lại khoản phí nếu phán quyết ủng hộ họ).

## 5. Sau khi tranh chấp kết thúc
- Hợp đồng được cập nhật trạng thái tương ứng (hoàn tất, hủy, refunded...).
- Feedback vẫn có thể để lại bình thường, trừ khi hợp đồng bị hủy trước khi kết thúc.
- Lịch sử tranh chấp và quyết định được lưu trong hồ sơ công việc để Upwork tham chiếu nếu xảy ra tranh chấp lặp lại.

## Xử lý khi tiền đã được release cho freelancer
- Khi milestone đã được **release hoàn toàn**, số tiền không còn nằm trong escrow nên không thể mở dispute fixed-price tiêu chuẩn.
- **Trong 30 ngày** kể từ ngày release, client vẫn có thể dùng tính năng **"Request a refund"**. Nếu freelancer chấp nhận, Upwork sẽ hoàn trả khoản tương ứng.
- Nếu freelancer **từ chối hoàn tiền**, Upwork chỉ hỗ trợ hòa giải nhẹ (không có cơ chế cưỡng chế hay trọng tài) và thường khuyên hai bên tự thương lượng/đưa thêm bằng chứng.
- Sau 30 ngày hoặc nếu hòa giải thất bại, lựa chọn còn lại là **thương lượng trực tiếp**, nhờ Upwork Support ghi nhận hoặc (đối với thanh toán thẻ) làm việc với ngân hàng để yêu cầu chargeback.

## Ghi chú chính sách bổ sung
- Dispute fixed-price chỉ áp dụng khi **vẫn còn tiền trong escrow** hoặc trong khoảng 30 ngày sau khi release.
- Upwork khuyến khích **tự giải quyết** trước khi leo thang vì phí trọng tài cao và mất thời gian (thường 3–6 tuần).
- Tranh chấp trên hợp đồng **Hourly** sử dụng quy trình khác (Weekly Review + Payment Protection) nên không đề cập ở đây.

## Gợi ý rút gọn quy trình cho bản demo luận văn

Để minh họa quy trình tranh chấp trong sản phẩm luận văn mà không phải tái hiện mọi thủ tục pháp lý phức tạp của Upwork, bạn có thể giữ/loại bớt các bước như sau:

- **Giữ bước mở dispute & thương lượng trực tiếp (Bước 1)**: đây là phần cốt lõi thể hiện người dùng mở tranh chấp, hai bên trao đổi trong phòng chat và đề xuất phương án release/refund. Cần mô phỏng hạn phản hồi (ví dụ 5 ngày) và trạng thái đóng dispute khi đạt thỏa thuận.
- **Giữ một bước "hòa giải nội bộ" đơn giản (rút gọn từ Bước 2)**: thay vì điều phối viên Upwork, bạn có thể dùng vai trò admin trong hệ thống demo đưa ra đề xuất trung gian. Phần này giúp thể hiện vòng leo thang đầu tiên nhưng không đòi hỏi quy trình kiểm chứng quá chi tiết.
- **Rút gọn bước thu phí trọng tài (Bước 3)**: chỉ cần minh họa bằng trạng thái hoặc nút "Yêu cầu đóng phí" và đánh dấu bên nào đã nộp trong bản demo tối thiểu. (Bản mô tả ban đầu giả lập, nhưng implementation hiện tại đã nâng cấp endpoint `arbitration-fees/confirm` để thu phí thật qua Stripe.)
- **Bỏ hoặc mô phỏng nhẹ bước trọng tài ràng buộc (Bước 4)**: vì khó triển khai trong demo, bạn có thể thay bằng quyết định cuối cùng do admin đưa ra sau khi cả hai bên được xem là đã "nộp phí". Điều này vẫn giữ được luồng trạng thái nhưng không phải tái hiện tổ chức trọng tài thật.
- **Giữ phần cập nhật kết quả (Bước 5)**: cần thể hiện hệ thống đóng dispute, phát hành/hoàn tiền theo quyết định cuối cùng, và ghi nhận lịch sử để phục vụ báo cáo.

Với cấu trúc trên, bạn vẫn trình bày đủ vòng đời tranh chấp (người dùng mở dispute → thương lượng → leo thang → quyết định cuối cùng) nhưng giảm thiểu những bước phức tạp, tốn chi phí hoặc vượt phạm vi demo.

### Sơ đồ quy trình mô phỏng cho module "trọng tài" trong demo

Sơ đồ dưới đây thể hiện lại luồng đã đề xuất ở trên, có bổ sung **role Trọng tài viên (admin)** để xử lý giai đoạn cuối cùng khi hai bên đã đóng phí mô phỏng.

```mermaid
flowchart TD
    A[Client / Freelancer mở dispute] --> B{Hai bên tự thương lượng?}
    B -- Có --> Z[Dispute đóng • Release/Refund theo thỏa thuận]
    B -- Không --> C[Admin tham gia hòa giải nội bộ]
    C --> D{Hai bên chấp nhận đề xuất admin?}
    D -- Có --> Z
    D -- Không --> E[Yêu cầu đóng phí trọng tài mô phỏng]
    E --> F{Cả hai bên đã đóng phí?}
    F -- Không --> G[Đóng dispute theo bên không đóng phí]
    F -- Có --> H[Admin khóa hồ sơ dispute & gom hồ sơ chứng cứ]
    H --> I[Chuyển cho Trọng tài viên (admin) xem xét]
    I --> J[Trọng tài viên ra quyết định cuối cùng]
    J --> K[Cập nhật trạng thái dispute • Release/Refund • Lưu lịch sử]
```

#### Ghi chú triển khai

- **Role Trọng tài viên** có thể tái sử dụng nhóm admin hiện có, với quyền:
  - truy cập hồ sơ dispute sau khi cả hai bên đã đóng phí mô phỏng;
  - cập nhật kết quả cuối cùng, bao gồm release/refund và ghi chú.
- **Khóa hồ sơ trước khi chuyển trọng tài**:
  - Khi admin xác nhận cả hai bên đã đóng phí, trạng thái dispute chuyển sang `ARBITRATION_READY`;
  - hệ thống **khóa** khả năng chỉnh sửa/tải thêm file của hai bên để tránh thay đổi phút cuối;
  - backend cung cấp **API "generate arbitration dossier"** gom toàn bộ log chat, file đính kèm, lịch sử milestone thành một gói JSON/PDF chuẩn; admin chỉ cần bấm nút kích hoạt để hệ thống dựng tự động, sau đó có thể đính kèm thêm ghi chú thủ công nếu muốn.
- **Cơ chế nộp bằng chứng chính thức trước bước trọng tài**:
  - Trước khi bấm khóa hồ sơ, mỗi bên sẽ thấy **form "Final evidence submission"** để liệt kê các luận điểm chính, đính kèm file chứng cứ bổ sung (hóa đơn, phiên bản sản phẩm, ảnh chụp, v.v.) và xác nhận rằng đây là gói bằng chứng cuối cùng của họ.
  - Các mục được khai trong form (statement, danh sách file, đường dẫn ngoài hệ thống) sẽ được đánh dấu `submittedBy: CLIENT/FREELANCER` và hợp nhất vào payload JSON của dossier.
  - Nếu một bên không có chứng cứ mới ngoài nội dung chat/file đã gửi, họ vẫn phải **nhấn xác nhận** để hệ thống ghi nhận trạng thái “No additional evidence” nhằm đảm bảo hai bên được đối xử công bằng và trọng tài viên biết rằng bên đó đã chốt hồ sơ.
  - Khi đính kèm file mới tại bước này, hệ thống **không ghi đè** lên các file milestone gốc: mỗi file upload sẽ được lưu như một bản ghi độc lập với `evidenceId`, `uploadedAt`, người thực hiện và `checksum` để trọng tài viên đối chiếu. Nhờ vậy họ biết rõ đây là bản bổ sung (ví dụ bản build mới, ảnh chụp bổ sung) chứ không phải bản đã nộp trong milestone. Nếu muốn dùng lại file cũ, chỉ cần tham chiếu đúng tên/đường dẫn đã tồn tại; hệ thống sẽ tự đưa cả hai bản (gốc và bổ sung) vào bảng evidence với chú thích thời gian, giúp trọng tài dễ so sánh.
  - **Không cần thêm bảng DB mới** để phục vụ tham chiếu: form có thể gửi danh sách ID của `MilestoneSubmissionAttachment`, `ChatMessageAttachment`… mà hệ thống đã lưu sẵn; backend chỉ cần ánh xạ chúng vào payload JSON/PDF của dossier. Nếu muốn theo dõi riêng các bản upload trong bước này, có thể tái sử dụng bảng lưu file chung (object storage + metadata) và thêm bảng nối `arbitration_evidence_item` gồm khóa ngoại tới dispute/dossier + khóa ngoại tới bản ghi file hiện có. Cả hai cách đều tránh phải tạo kho lưu trữ tách biệt.
  - Nhờ vậy, trọng tài viên luôn có cả **log chat & file tự động gom** lẫn **gói bằng chứng chính thức** do từng bên xác nhận, tránh tình trạng một bên viện lý do “chưa kịp nộp” sau khi hồ sơ bị khóa.

### API triển khai trong backend demo

| Bước | Endpoint | Quyền gọi | Ghi chú chính |
| --- | --- | --- | --- |
| Nộp bằng chứng cuối | `POST /contracts/:contractId/milestones/:milestoneId/disputes/:disputeId/final-evidence` | Client hoặc freelancer của hợp đồng | Body gồm `statement?`, `noAdditionalEvidence?`, `items?` (tối đa 50 mục). Mỗi `items[i]` bắt buộc trường `sourceType` (`MILESTONE_ATTACHMENT` \| `CHAT_ATTACHMENT` \| `ASSET` \| `EXTERNAL_URL`) và cung cấp đúng ID/url tương ứng (`sourceId`, `assetId`, `url`). Backend xác thực quyền truy cập file, cập nhật bảng `arbitration_evidence_submission` và `arbitration_evidence_item`, đồng thời trả về submission đã chuẩn hóa. |
| Khóa hồ sơ dispute | `POST /admin/disputes/:disputeId/lock` | Admin đã join tranh chấp | Body `{ note?: string }`. API chỉ thành công khi trạng thái là `ARBITRATION_READY`, cả client và freelancer đã nộp bằng chứng cuối. Kết quả trả về dispute detail kèm danh sách evidence. |
| Tổng hợp dossier | `POST /admin/disputes/:disputeId/dossiers` | Admin | Body `{ notes?: string, finalize?: boolean }`. Tạo bản ghi `arbitration_dossier`, chèn payload JSON (kèm `hash` SHA-256, timeline, evidence đã giải tham chiếu) và cập nhật `currentDossierVersion`. Response vẫn là dispute detail với trường `arbitrationDossiers`. |

#### Ví dụ payload khi freelancer nộp bằng chứng

```jsonc
{
  "statement": "Freelancer đã đẩy bản build QA cùng log kiểm thử.",
  "items": [
    {
      "sourceType": "MILESTONE_ATTACHMENT",
      "sourceId": "msa_123",
      "label": "Bản build milestone",
      "description": "APK nộp ngày 12/05"
    },
    {
      "sourceType": "EXTERNAL_URL",
      "url": "https://drive.google.com/file/d/...",
      "label": "Video walkthrough"
    }
  ]
}
```

Để xác nhận không có tài liệu mới, gửi `{ "noAdditionalEvidence": true }`. Khi danh sách `items` khác rỗng, cờ này tự động bị bỏ qua.

#### Response mẫu của các API admin

```jsonc
{
  "dispute": { "id": "dsp_1", "status": "ARBITRATION_READY", "lockedAt": "2024-09-12T09:15:00.000Z", ... },
  "evidenceSubmissions": [
    {
      "id": "aes_123",
      "statement": "...",
      "submittedAt": "2024-09-12T08:30:00.000Z",
      "items": [
        {
          "id": "aei_456",
          "sourceType": "MILESTONE_ATTACHMENT",
          "reference": {
            "type": "MILESTONE_ATTACHMENT",
            "attachment": {
              "id": "msa_123",
              "url": "https://cdn.example.com/milestones/msa_123.apk",
              "submission": { "milestoneTitle": "UI design" }
            }
          }
        }
      ]
    }
  ],
  "arbitrationDossiers": [
    { "id": "ads_001", "version": 1, "status": "LOCKED", "hash": "5e4b..." }
  ]
}
```

Từ response trên, giao diện admin có thể hiển thị tiến trình thu thập chứng cứ, ai đã khóa hồ sơ và tải dossier mới nhất.
- **Ý nghĩa của dossier dạng JSON/PDF so với hiển thị giao diện**:
  - JSON/PDF tạo thành **bản chụp trạng thái (snapshot)** có thể gửi qua email hoặc lưu trữ ngoài hệ thống; giao diện chỉ xem được khi còn quyền truy cập backend.
  - File tĩnh giúp **đảm bảo tính toàn vẹn và dấu vết**: mỗi lần tạo dossier có thể gắn mã hash/timestamp để chứng minh nội dung không bị chỉnh sửa; dữ liệu trên màn hình khó chứng minh vì phụ thuộc API thời điểm xem.
  - Dossier hỗ trợ **làm việc ngoại tuyến và chia sẻ đa nền tảng** (in, chú thích, ký số). UI thì thuận cho duyệt nhanh nhưng khó thao tác trong môi trường không kết nối.
  - Màn hình vẫn hữu ích cho việc rà soát nội bộ; tuy nhiên khi chuyển hồ sơ cho trọng tài viên hoặc luật sư bên ngoài, một gói JSON/PDF sẽ phù hợp hơn vì không yêu cầu họ truy cập hệ thống quản trị.
- **Nội dung cụ thể của file PDF bàn giao trọng tài**:
  - PDF được render trực tiếp từ payload JSON cùng thời điểm khóa hồ sơ, bao gồm đầy đủ **metadata** (ID, thời gian, trạng thái, người tạo), **tóm tắt tranh chấp**, **dòng thời gian sự kiện** và **bảng kết quả tài chính** (số tiền mỗi bên yêu cầu/được phân bổ, phí hoàn lại).
  - Phần **lời khai hai bên** được rút từ log chat và form cung cấp bằng chứng: mỗi phát ngôn quan trọng sẽ có timestamp, người gửi và nội dung trích dẫn. Có thể thêm mục “Statement Highlights” để admin chọn lọc các luận điểm chính.
  - Mục **evidence** liệt kê toàn bộ file/đường dẫn đã khóa cùng checksum/hash; để tránh phình PDF, nội dung file lớn (ảnh, video, source code) không nhúng trực tiếp mà thể hiện dưới dạng bảng chỉ mục + liên kết tải (kèm hash để đối chiếu).
  - Khi cần đóng gói 100% offline, backend có thể tùy chọn nhúng bản sao nhị phân (base64) hoặc tạo kèm một **archive .zip** đi cùng PDF; metadata trong PDF vẫn chỉ ra vị trí và hash của từng file.
- **PDF có thay thế hoàn toàn bằng chứng và lời khai gốc không?**
  - PDF đóng vai trò **gói tóm tắt chính thức** cho trọng tài viên, đủ để đọc nhanh bối cảnh và đối chiếu các lời khai đã cung cấp. Tuy nhiên nó **không thay thế hoàn toàn** bằng chứng gốc: các file gốc vẫn được lưu trữ riêng (object storage) và được tham chiếu qua URL/hash trong PDF.
  - Trọng tài viên có thể dựa trên PDF để biết mình cần tải file nào, kiểm tra chữ ký số/hash để đảm bảo file không bị sửa. Nếu phát sinh tranh chấp về nội dung bằng chứng, hệ thống vẫn lấy **nguồn gốc (original evidence)** làm chuẩn.
  - Vì vậy, pipeline nên đảm bảo **đồng bộ song song**: khóa tranh chấp → sinh payload JSON/PDF → lưu lại bản PDF + danh sách hash → giữ nguyên kho bằng chứng để có thể xuất trình bản gốc khi cần.
- **Đề xuất schema cho `arbitration dossier` (dùng chung cho JSON/PDF)**:
  - Nên chuẩn hóa theo cấu trúc 4 phần chính: `meta`, `parties`, `financials`, `evidence` để cả backend và giao diện hiểu thống nhất.
  - Ví dụ schema JSON (Draft 7) dưới đây phản ánh tối thiểu thông tin cần có; có thể chuyển đổi sang TypeScript interface hoặc Prisma model phụ trợ nếu muốn lưu cache:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ArbitrationDossier",
  "type": "object",
  "required": ["meta", "parties", "financials", "timeline"],
  "properties": {
    "meta": {
      "type": "object",
      "required": ["dossierId", "disputeId", "generatedAt", "generatedBy", "status"],
      "properties": {
        "dossierId": { "type": "string", "description": "UUID của hồ sơ chốt" },
        "disputeId": { "type": "string" },
        "status": { "type": "string", "enum": ["NEGOTIATION", "INTERNAL_MEDIATION", "ARBITRATION_READY", "ARBITRATION_DECISION", "RESOLVED"] },
        "generatedAt": { "type": "string", "format": "date-time" },
        "generatedBy": { "type": "string", "description": "Admin kích hoạt API" },
        "hash": { "type": "string", "description": "Tùy chọn: hash SHA-256 để kiểm chứng" }
      }
    },
    "parties": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["role", "userId", "displayName"],
        "properties": {
          "role": { "type": "string", "enum": ["CLIENT", "FREELANCER", "ARBITRATION_OFFICER"] },
          "userId": { "type": "string" },
          "displayName": { "type": "string" },
          "feePaid": { "type": "boolean" },
          "notes": { "type": "string" }
        }
      },
      "minItems": 2
    },
    "financials": {
      "type": "object",
      "required": ["escrowAmount", "currency", "requested", "decided"],
      "properties": {
        "escrowAmount": { "type": "number" },
        "currency": { "type": "string" },
        "requested": {
          "type": "object",
          "properties": {
            "client": { "type": "number" },
            "freelancer": { "type": "number" }
          }
        },
        "decided": {
          "type": "object",
          "properties": {
            "client": { "type": "number" },
            "freelancer": { "type": "number" },
            "feeRefund": { "type": "number" }
          }
        }
      }
    },
    "timeline": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["at", "actor", "action"],
        "properties": {
          "at": { "type": "string", "format": "date-time" },
          "actor": { "type": "string" },
          "action": { "type": "string" },
          "details": { "type": "string" }
        }
      }
    },
    "evidence": {
      "type": "object",
      "properties": {
        "messages": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["sentAt", "from", "body"],
            "properties": {
              "sentAt": { "type": "string", "format": "date-time" },
              "from": { "type": "string" },
              "body": { "type": "string" }
            }
          }
        },
        "attachments": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "url", "hash"],
            "properties": {
              "name": { "type": "string" },
              "url": { "type": "string", "format": "uri" },
              "hash": { "type": "string" },
              "uploadedBy": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```
- Khi xuất ra PDF, backend chỉ cần render schema này dưới dạng bảng/section. Payload JSON là nguồn sự thật và có thể tái sử dụng cho mọi kênh xuất bản.
- **Phí trọng tài mô phỏng** vẫn giữ nguyên bằng các cờ boolean để track bên nào đã xác nhận đóng phí.
- **Lịch sử hoạt động**: log các sự kiện chính (mở dispute, đổi trạng thái, quyết định cuối) để hỗ trợ báo cáo và tái hiện quy trình trong demo.

#### Mở rộng schema Prisma để lưu hồ sơ trọng tài

- Bổ sung enum `ArbitrationDossierStatus` để biểu diễn vòng đời hồ sơ (`DRAFT` → `LOCKED` → `FINALIZED` → `ARCHIVED`).
- Mở rộng `DisputeStatus` nhằm phản ánh đúng luồng ở trên: `INTERNAL_MEDIATION` sau khi admin tham gia, `ARBITRATION_READY` khi hồ sơ đã khóa và sẵn sàng chuyển, kế đến `ARBITRATION` cho giai đoạn ra quyết định.
- Thêm các trường mới trong model `Dispute` để chốt thông tin khóa hồ sơ (`lockedAt`, `lockedById`), đánh dấu version hồ sơ đang dùng (`currentDossierVersion`) và quan hệ tới bảng dossier.
- Lưu vết người khóa/generates dossier thông qua quan hệ với `User`.

Ví dụ Prisma schema rút gọn:

```prisma
enum ArbitrationDossierStatus {
  DRAFT
  LOCKED
  FINALIZED
  ARCHIVED
}

enum DisputeStatus {
  OPEN
  NEGOTIATION
  INTERNAL_MEDIATION
  AWAITING_ARBITRATION_FEES
  ARBITRATION_READY
  ARBITRATION
  RESOLVED_RELEASE_ALL
  RESOLVED_REFUND_ALL
  RESOLVED_SPLIT
  CANCELED
  EXPIRED
}

model Dispute {
  id                    String   @id @default(cuid())
  status                DisputeStatus @default(OPEN)
  lockedAt              DateTime?
  lockedById            String?
  currentDossierVersion Int?

  lockedBy             User?                @relation("DisputeLockedBy", fields: [lockedById], references: [id])
  arbitrationDossiers  ArbitrationDossier[]
}

model ArbitrationDossier {
  id            String   @id @default(cuid())
  disputeId     String
  version       Int      @default(1)
  status        ArbitrationDossierStatus @default(DRAFT)
  payload       Json
  hash          String?
  pdfUrl        String?
  generatedById String?
  generatedAt   DateTime @default(now())
  lockedAt      DateTime?
  finalizedAt   DateTime?

  dispute     Dispute @relation(fields: [disputeId], references: [id], onDelete: Cascade)
  generatedBy User?   @relation("ArbitrationDossierGeneratedBy", fields: [generatedById], references: [id], onDelete: SetNull)

  @@unique([disputeId, version])
  @@map("arbitration_dossier")
}
```

- Trên `User`, khai báo quan hệ ngược `disputesLocked` và `arbitrationDossiersGenerated` để truy cập nhanh các hồ sơ mà admin đã thao tác.
- Với MySQL (đúng như cấu hình Prisma hiện tại), `payload` dùng kiểu `Json`, `hash`/`pdfUrl` dùng `VARCHAR`. Nếu cần audit sâu hơn, có thể bổ sung bảng event log riêng nhưng chưa bắt buộc cho demo.

