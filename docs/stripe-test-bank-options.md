# Stripe test bank account lựa chọn

Trong môi trường test của Stripe Connect, danh sách "StripeBank" mà dashboard gợi ý chỉ là các tài khoản ảo để mô phỏng ngân hàng nhận payout. Bạn có thể chọn bất kỳ mục nào trong danh sách nếu:

1. **Đúng loại tiền tệ/quốc gia** – Ví dụ một tài khoản IBAN kiểu FR chỉ dùng cho account Pháp; nếu bạn đang test account Hoa Kỳ thì nên dùng routing/account number của US bank test mà Stripe cung cấp.
2. **Phù hợp với capability** – Nếu account cần nhận payout bằng EUR, hãy chọn ngân hàng EUR; nếu cần USD thì dùng ngân hàng USD.
3. **Không dùng cho live** – Đây chỉ là môi trường test, hoàn toàn không áp dụng cho live payouts.

Nếu bạn chọn bừa một tài khoản nhưng currency hoặc country không khớp với account Connect, Stripe sẽ tiếp tục báo restricted hoặc payout failed. Vì vậy hãy chọn đúng profile test bank mà Stripe gợi ý cho quốc gia/currency của freelancer, hoặc nhập thủ công giá trị test theo bảng trong tài liệu Stripe.

## Banner “actions required” trong Stripe Express

Giao diện giống hình bạn gửi (Stripe Express với banner cam “actions required”) chính là nơi Stripe yêu cầu freelancer cập nhật thông tin xác thực. Khi một connected account có số dư nhưng chưa có dữ liệu payout hợp lệ, dashboard sẽ hiển thị:

- **Banner màu cam**: nhấn vào nút “Mettre à jour”/“Update” để mở form yêu cầu tài liệu.
- **Mục “Actions requises” trong thanh bên**: liệt kê các mục cần bổ sung (ví dụ xác minh danh tính, địa chỉ, hoặc tài khoản ngân hàng).
- **Thông báo “Aucune transaction ne se fera…”**: Stripe tạm dừng payouts cho tới khi hoàn thành checklist.

Để account trở lại trạng thái `Active`, freelancer cần đi theo các liên kết trong banner, nhập lại thông tin cá nhân/bank chính xác (hoặc giá trị test hợp lệ trong sandbox) và chờ Stripe xác minh xong. Khi mọi mục chuyển sang “Completed”/“Enabled”, banner sẽ biến mất và tài khoản hết bị restrict.
