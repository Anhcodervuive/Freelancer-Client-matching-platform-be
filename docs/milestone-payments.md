# Milestone payment flow ghi chú

## Idempotency Key (`idemKey`)

* Thuộc tính `idemKey` trong bảng `payment` và `transfer` dùng để lưu lại idempotency key khi gọi tới Stripe. Điều này cho phép backend khôi phục thông tin yêu cầu trước đó nếu client vô tình gửi lại cùng một idempotency key, tránh tạo giao dịch trùng lặp.
* Khi fund milestone, dịch vụ đọc `payload.idempotencyKey` rồi truyền vào `stripe.paymentIntents.create(...)`. Nếu khóa tồn tại thì cũng được lưu vào bản ghi payment (`PaymentStatus.SUCCEEDED`) để các lần retry sau dễ dàng đối chiếu.【F:src/services/contract.service.ts†L1291-L1346】
* Trường hợp Stripe yêu cầu xác thực bổ sung, cùng `idemKey` sẽ được gắn lên bản ghi `payment` với trạng thái `REQUIRES_ACTION`, giúp hệ thống nhận diện đây là lần retry của cùng payment intent khi client quay lại hoàn tất 3DS.【F:src/services/contract.service.ts†L1374-L1404】

## Yêu cầu xác thực 3DS (`requires_action`)

Quy trình yêu cầu xác thực 3DS diễn ra tuần tự như sau:

1. Stripe có thể trả về `StripeCardError` với `payment_intent.status === 'requires_action'` nếu ngân hàng phát hành yêu cầu thử thách 3-D Secure. Backend bắt trường hợp này, upsert bản ghi `payment` với trạng thái `REQUIRES_ACTION`, gắn `idemKey` và trả về `clientSecret` cho frontend.【F:src/services/contract.service.ts†L1374-L1404】
2. Frontend gọi `stripe.confirmCardPayment(clientSecret, { payment_method: ... })` hoặc API tương đương để Stripe.js hiển thị khung xác thực 3DS cho khách hàng (OTP, push notification của ngân hàng, v.v.). Khi người dùng hoàn thành thử thách, Stripe cập nhật Payment Intent sang `succeeded` (hoặc `processing`).
3. Sau khi 3DS thành công, client retry endpoint `payMilestone` cùng `idempotencyKey` ban đầu. Stripe nhận ra Payment Intent đã tồn tại và trả về kết quả thành công, cho phép backend đi vào nhánh `SUCCEEDED`, cập nhật escrow và bản ghi `payment` tương ứng.【F:src/services/contract.service.ts†L1321-L1367】
4. Nếu khách hàng bỏ dở hoặc xác thực thất bại, Payment Intent giữ trạng thái `requires_action`. Backend dựa vào `paymentIntentId`/`idemKey` đã lưu để hiển thị tình trạng chờ xử lý và cho phép client khởi động lại bước 2 cho tới khi hoàn tất hoặc hủy payment.

Stripe còn gửi webhook `payment_intent.succeeded`/`payment_intent.payment_failed`. Dù webhook hỗ trợ đồng bộ trạng thái, hệ thống vẫn dựa vào lần retry ở bước 3 để đảm bảo milestone chỉ được đánh dấu funded sau khi 3DS thành công.

### Bật bắt buộc 3DS trong Stripe

1. Truy cập Dashboard Stripe với quyền quản trị, mở **Radar → Rules** và tạo rule `require_3d_secure :card_present = false` (hoặc sử dụng mẫu "Require 3D Secure for all card payments"). Stripe cũng cung cấp tùy chọn nhanh tại **Payments → Settings → Manage 3D Secure**, chọn `Always require 3D Secure` cho môi trường test trước khi áp dụng production.
2. Nếu chỉ muốn áp cho một số quốc gia hoặc mức rủi ro, có thể tinh chỉnh rule với điều kiện bổ sung như `:country = 'VN'`.
3. Sau khi bật rule, mọi Payment Intent phù hợp đều trả về `status = requires_action` cùng `next_action`.

Backend hỗ trợ cấu hình buộc gửi yêu cầu 3DS bằng biến môi trường `STRIPE_FORCE_3DS`. Khi thiết lập `STRIPE_FORCE_3DS=true`, API `payMilestone` truyền `payment_method_options.card.request_three_d_secure = 'any'` để Stripe bắt buộc xác thực, đồng thời phản hồi trả kèm trường `nextAction` giúp frontend kích hoạt thử thách 3DS qua Stripe.js.【F:src/config/environment.ts†L64-L66】【F:src/services/contract.service.ts†L1293-L1404】
