# API thống kê tài chính

Tài liệu này mô tả hai API thống kê chính cho client và freelancer.

## 1. Client – thống kê chi tiêu

- **Endpoint**: `GET /api/client/financial/spending-statistics`
- **Mục đích**: Tổng hợp số tiền client đã thanh toán (gross), số tiền được hoàn (refund) và chi ròng (net) theo từng loại tiền tệ, kèm theo dòng thời gian.
- **Tham số truy vấn**:
  - `from`, `to` (ISO 8601, tùy chọn): Giới hạn khoảng thời gian cần thống kê. Nếu bỏ trống, hệ thống mặc định 6 tháng gần nhất (granularity = `month`) hoặc 30 ngày gần nhất (granularity = `day`).
  - `granularity` (`day` | `month`, mặc định `month`): Kỳ gộp của dữ liệu dòng thời gian.
  - `currency` (3 ký tự, tùy chọn): Lọc theo một loại tiền tệ cụ thể.
- **Kết quả trả về**:
  - `filters`: Khoảng thời gian và tham số áp dụng sau khi chuẩn hóa.
  - `summary`: Danh sách theo tiền tệ bao gồm tổng đã chi (`grossAmount`), tổng hoàn (`refundAmount`), chi ròng (`netAmount`) và thống kê số lượng giao dịch (tổng, thành công, hoàn tiền, giao dịch có hoàn).
  - `timelineByCurrency`: Dòng thời gian theo từng tiền tệ với các mốc `period`, `grossAmount`, `refundAmount`, `netAmount` và số lượng giao dịch.

## 2. Freelancer – tổng quan thu nhập và chi tiêu

- **Endpoint**: `GET /api/freelancer/financial/overview`
- **Mục đích**: Cung cấp snapshot tổng quan thu nhập của freelancer (tiền đang giữ trong escrow, đang chuyển, đã sẵn sàng rút, bị hoàn/trả lại) và tái sử dụng thống kê chi tiêu tương tự client cho các khoản freelancer tự thanh toán (ví dụ phí trọng tài, dịch vụ phụ trợ).
- **Tham số truy vấn**: giống với endpoint phía client (`from`, `to`, `granularity`, `currency`).
- **Các trường dữ liệu chính**:
  - `filters`: Khoảng thời gian áp dụng cho tính toán thu nhập.
  - `earnings.summary`: Mảng theo tiền tệ gồm:
    - `escrowHoldingAmount`: Tiền đang nằm trong escrow (đã được client nạp nhưng chưa giải ngân cho freelancer).
    - `pendingPayoutAmount`: Tổng số tiền đang trong trạng thái `PENDING` trên Stripe transfer – chờ về tài khoản freelancer.
    - `availablePayoutAmount`: Tổng số tiền transfer ở trạng thái `SUCCEEDED`, đã nằm trong tài khoản sẵn sàng rút.
    - `failedPayoutAmount` và `reversedPayoutAmount`: Tổng tiền transfer thất bại hoặc bị đảo chiều.
    - `transferCount`: Thống kê số lượng transfer ở từng trạng thái và tổng cộng.
  - `earnings.timelineByCurrency`: Dòng thời gian theo từng tiền tệ, thể hiện số tiền và số lượng transfer ở từng trạng thái trong khoảng thời gian được lọc.
  - `spending`: Đối tượng thống kê chi tiêu tái sử dụng từ API của client, giúp freelancer theo dõi các khoản tiền đã chi ra.

## Quy tắc xử lý chung

- Các tham số truy vấn được kiểm tra bằng `SpendingStatisticsQuerySchema`; API trả lỗi 400 nếu `from > to` hoặc `currency` không hợp lệ.
- Khi không có dữ liệu cho một loại tiền tệ, hệ thống vẫn trả về dòng timeline rỗng cùng các số liệu bằng 0 nếu người dùng lọc theo `currency` cụ thể.
- Tiền tệ được chuẩn hóa viết hoa (`usd`, `vnd`, ... → `USD`, `VND`) để đồng bộ với dữ liệu lưu trữ.

