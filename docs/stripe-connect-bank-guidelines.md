# Hướng dẫn chọn ngân hàng cho Stripe Connect (Tiếng Việt)

Để tránh lỗi `external_account` hoặc trạng thái payouts bị khoá khi dùng Stripe Connect, freelancer nên chuẩn bị và kiểm tra kỹ thông tin ngân hàng trước khi nhập vào form Stripe. Dưới đây là một số lưu ý thực tế chúng tôi đã kiểm chứng trong môi trường thử nghiệm Stripe:

## 1. Chọn đúng loại tài khoản và ngân hàng được Stripe hỗ trợ
- **Tài khoản cá nhân**: Stripe Express chỉ chấp nhận tài khoản mang tên cá nhân trùng khớp 100% với thông tin trong hồ sơ freelancer. Không sử dụng tài khoản doanh nghiệp hoặc tài khoản đứng tên người thân.
- **Ngân hàng nội địa được hỗ trợ**: Ở Việt Nam, Stripe ưu tiên các ngân hàng lớn như Vietcombank, Techcombank, ACB, TPBank, VPBank. Tránh dùng các ngân hàng số hoặc ngân hàng mới vì Stripe thường không thể xác minh được mã SWIFT.
- **Định dạng số tài khoản**: Stripe phân biệt rõ số tài khoản và số thẻ. Hãy nhập đúng số tài khoản thanh toán (thường từ 9–14 chữ số), không nhập số thẻ ATM 16 số.

## 2. Kiểm tra lại thông tin trước khi gửi
- **Tên chủ tài khoản**: Ghi đầy đủ dấu, in hoa đầu dòng giống giấy tờ tùy thân. Ví dụ `NGUYEN VAN A` thay vì `Nguyen Van A` hoặc `A Nguyen`.
- **Mã ngân hàng/SWIFT**: Stripe yêu cầu mã SWIFT/BIC hợp lệ (ví dụ: `VCBCVNVX` cho Vietcombank). Nếu không biết mã, hãy kiểm tra tại website chính thức của ngân hàng.
- **Tiền tệ rút**: Tài khoản phải hỗ trợ loại tiền tệ mà Stripe chuyển về. Với freelancer Việt Nam, nên để `currency = vnd` khi tạo payout để tránh lỗi chênh lệch tiền tệ.

## 3. Đảm bảo tài khoản đang hoạt động
- Tài khoản phải bật Internet Banking và có thể nhận chuyển khoản nội địa.
- Không sử dụng tài khoản mới mở nhưng chưa kích hoạt; Stripe sẽ đánh dấu "bank_account_unverified" cho tới khi ngân hàng xác thực.

## 4. Cập nhật khi Stripe báo lỗi
Nếu Stripe báo lỗi ngân hàng (ví dụ `external_account.bank_name_invalid`), hãy:

1. Gọi API `POST /api/freelancer/connect-account/requirements-link` để lấy link cập nhật.
2. Kiểm tra danh sách `targetedRequirements` trong response để biết chính xác hạng mục cần sửa.
3. Truy cập link Stripe, cập nhật lại thông tin ngân hàng theo đúng hướng dẫn ở trên.

Sau khi hoàn tất, Stripe thường xác nhận trong vòng vài phút. Hệ thống của chúng ta sẽ tự đồng bộ trạng thái và freelancer có thể rút tiền lại bình thường.

> **Mẹo**: Nếu vẫn gặp lỗi, hãy xoá tài khoản ngân hàng khỏi Stripe Express rồi thêm lại từ đầu với thông tin mới để Stripe chạy lại quy trình xác minh.

## 5. Yêu cầu Stripe bật lại capability khi tài khoản bị khoá
- Sau khi cập nhật đầy đủ hồ sơ (bao gồm giấy tờ định danh và ngân hàng), gọi API `POST /api/freelancer/connect-account/capabilities/retry`.
- Backend sẽ gửi yêu cầu tới Stripe để kích hoạt lại các capability quan trọng như `card_payments`, `transfers`, `platform_payments`, `bank_account_payments` và `cash_balance`, đồng thời trả về `capabilityStatuses` mô tả tình trạng mới nhất từng capability.
- Nếu trạng thái vẫn là `inactive`, hãy kiểm tra trường `currentlyDueMessages`/`pastDueMessages` trong response để biết các hạng mục còn thiếu và tiếp tục hoàn tất trên Stripe Dashboard.
