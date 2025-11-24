# Điều chỉnh quy trình xử lý tranh chấp (bản tóm tắt tiếng Việt)

## Mục tiêu
Loại bỏ giai đoạn **trọng tài tự động** và chỉ giữ lại thương lượng trực tiếp cùng bước **hòa giải do admin đề xuất**. Nếu hai bên không đồng thuận với đề xuất này, tranh chấp sẽ chuyển sang hướng tự giải quyết qua tòa án, nền tảng không đưa ra phán quyết ràng buộc.

## Những phần cần loại bỏ
- **Thu phí trọng tài**: bỏ toàn bộ luồng thu/kiểm tra phí trọng tài (các state như `AWAITING_ARBITRATION_FEES`, `ARBITRATION_READY`, deadline phí, và các endpoint liên quan).
- **Giai đoạn trọng tài ràng buộc**: bỏ vai trò/trạng thái gán trọng tài độc lập và việc ra quyết định có tính cưỡng chế pháp lý.
- **Quy trình hồ sơ bằng chứng dành cho trọng tài**: bỏ các thao tác khóa tranh chấp, nộp bằng chứng cuối, tạo/gửi hồ sơ trọng tài, và các entity/endpoint chỉ phục vụ cho việc đóng gói hồ sơ trọng tài.

## Những phần giữ lại và đơn giản hóa
- **Phòng thương lượng trực tiếp**: client và freelancer trao đổi để tự thỏa thuận (phát hành tiền/thanh toán hoàn) trong thời hạn phản hồi cố định.
- **Hòa giải bởi admin**: admin tham gia luồng trò chuyện và đưa ra đề xuất không ràng buộc; mỗi bên có thời hạn ngắn để chấp nhận hoặc từ chối.

## Những bổ sung/điều chỉnh thay cho trọng tài
- **Xử lý kết quả sau hòa giải**: nếu một bên từ chối hoặc hết hạn mà không phản hồi, đánh dấu tranh chấp là "Không giải quyết được – tự xử lý qua tòa án"; nền tảng dừng việc phán quyết.
- **Công cụ nhẹ cho admin**:
  - Đánh dấu tranh chấp đang ở trạng thái "Đang hòa giải".
  - Đăng một đề xuất chia tiền/hoàn tiền kèm thời hạn phản hồi.
  - Tự động đóng tranh chấp thành "Đã giải quyết" khi cả hai bên đồng ý, hoặc "Không giải quyết" khi hết hạn/bị từ chối.
- **Lưu vết & nhắn tin**: giữ đầy đủ lịch sử chat/timeline để hai bên có thể tải về hoặc dùng khi ra tòa.

## Bằng chứng nên cung cấp cho tòa (tham khảo thực hành của các nền tảng lớn)
- **Hợp đồng/văn bản thỏa thuận**: điều khoản dự án, phạm vi công việc, milestone, yêu cầu đầu ra.
- **Giao tiếp và nhật ký thời gian**: toàn bộ lịch sử chat/email, thời điểm gửi/nhận, ghi chú cuộc họp (nếu có) để chứng minh ý chí, cam kết và phản hồi của hai bên.
- **Dữ liệu thanh toán và escrow**: số tiền đã nạp/giải ngân, lịch sử giao dịch, các lần giữ/hoàn tiền, phí dịch vụ; tương đương với export billing trên Upwork hoặc Fiverr Workspace.
- **Bằng chứng giao nhận sản phẩm**: link/bản sao file bàn giao, commit/mốc triển khai, biên bản nghiệm thu (nếu có) để chứng minh công việc đã/ chưa đạt yêu cầu.
- **Kết quả hòa giải nội bộ**: đề xuất của admin, thời hạn phản hồi, trạng thái chấp nhận/từ chối của hai bên; đây là bằng chứng đã cố gắng giải quyết trước khi ra tòa.
- **Log hệ thống liên quan**: thời gian cập nhật yêu cầu, thay đổi deadline/phạm vi, ghi nhận hành vi vi phạm (nếu có). Chỉ xuất/đính kèm những log cần thiết và ẩn dữ liệu nhạy cảm.

> Lưu ý: nền tảng không cung cấp phán quyết hay tư vấn pháp lý; bộ chứng cứ trên chỉ nhằm chứng minh lịch sử giao dịch và nỗ lực thương lượng/hòa giải trước khi đương sự khởi kiện.

## Ai gửi bộ chứng cứ ra tòa?
- **Ưu tiên để các bên tự nộp**: Client và freelancer tự nộp hồ sơ theo hướng dẫn của tòa án để giữ tính trung lập, tránh rủi ro pháp lý cho nền tảng và đảm bảo mỗi bên chủ động lựa chọn thông tin họ muốn cung cấp.
- **Nền tảng chỉ hỗ trợ xuất dữ liệu**: cung cấp chức năng tải/khôi phục lịch sử chat, giao dịch và biên bản hòa giải ở dạng read-only. Nền tảng không đại diện pháp lý, không gửi hồ sơ thay cho các bên, trừ khi có yêu cầu hợp pháp (ví dụ yêu cầu từ tòa/điều tra được xác thực).
- **Bảo mật & tối thiểu hóa dữ liệu**: khi xuất dữ liệu theo yêu cầu hợp pháp, cần ẩn/masking thông tin nhạy cảm không liên quan và ghi log truy vết (ai yêu cầu, thời gian, phạm vi dữ liệu đã cung cấp).

### Quy trình hỗ trợ và kiểm soát chia sẻ dữ liệu
- **Tự phục vụ (ưu tiên)**: cung cấp nút export trong trang tranh chấp để hai bên tự tải lịch sử chat, giao dịch và đề xuất hòa giải ở định dạng read-only (PDF/JSON), kèm dấu thời gian/hàm băm để xác thực tính toàn vẹn.
- **Yêu cầu hỗ trợ của admin (không thay mặt nộp)**: khi người dùng gặp khó khăn, admin có thể tạo export và gửi lại cho chính người yêu cầu; không gửi trực tiếp cho tòa án trừ khi có căn cứ pháp lý.
- **Xử lý yêu cầu từ cơ quan có thẩm quyền**: chỉ chia sẻ dữ liệu khi nhận được yêu cầu hợp lệ (lệnh tòa, yêu cầu điều tra có xác thực). Thực hiện kiểm tra pháp lý nội bộ, giới hạn phạm vi tối thiểu và ghi log đầy đủ (số hồ sơ, người duyệt, nội dung chia sẻ).
- **Lưu trữ và hủy dữ liệu export**: đặt thời hạn lưu tạm bản export (ví dụ 30 ngày) rồi tự động xóa để giảm rủi ro lộ lọt dữ liệu; người dùng có thể tạo lại khi cần.
