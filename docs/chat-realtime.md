# Thiết kế realtime chat sử dụng Redis

Tài liệu này mô tả kiến trúc realtime cho tính năng chat giữa client – freelancer và quyền truy cập của admin.

## Kiến trúc tổng quan

- **Socket.IO**: cung cấp kết nối WebSocket/long-polling giữa client và server.
- **Redis**: được dùng làm kho in-memory cho các trạng thái realtime và bộ nhớ đệm ngắn hạn:
  - Lưu trạng thái online/offline và đếm số kết nối đang mở của mỗi user.
  - Cập nhật `typing indicator`, hàng đợi tin nhắn offline, cache metadata cuộc trò chuyện.
  - Ghi log sự kiện ngắn hạn (`chat:logs:events`) phục vụ analytics real-time.
- **MySQL (Prisma)**: ghi nhận tin nhắn, receipts, quan hệ participant bảo đảm toàn vẹn dữ liệu phục vụ dispute.

## Các tính năng chính

### 1. Presence & typing indicator
- Khi socket authenticated kết nối, server gọi `markUserOnline` và duy trì TTL trên key `chat:presence:<userId>`.
- Khi người dùng bắt đầu gõ, client gửi sự kiện `chat:typing`; server ghi key `chat:typing:<threadId>:<userId>` trong Redis với TTL vài giây và broadcast cho các participant khác.
- Sau khi disconnect, `markUserOffline` giảm bộ đếm kết nối; nếu không còn socket nào, server broadcast trạng thái offline đến từng phòng chat đã tham gia.

### 2. Quản lý phòng chat và metadata
- Sự kiện `chat:join` kiểm tra quyền truy cập của user, join phòng `chat:thread:<threadId>` và trả về thông tin luồng đã cache trong Redis (tối đa 5 phút).
- Nếu metadata chưa có trong cache, server truy vấn Prisma (kèm thông tin profile cơ bản) rồi lưu vào Redis.

### 3. Gửi tin nhắn và rate limiting
- `chat:send-message` kiểm tra giới hạn 25 tin/phút mỗi user thông qua `INCR` trên Redis.
- Tin nhắn mới được ghi vào MySQL trong transaction cùng receipts và cập nhật last read cho người gửi.
- Tin nhắn được broadcast tới phòng; đồng thời ghi log `message_sent` vào Redis Stream phục vụ dashboard realtime.

### 4. Hàng đợi tin nhắn offline
- Với mỗi participant đang offline, payload tin nhắn được đẩy vào `RPUSH chat:offline:<userId>` và cắt chiều dài tối đa 200 phần tử.
- Khi user kết nối lại, server đọc toàn bộ queue, emit từng tin và cập nhật `deliveredAt` trong bảng `ChatMessageReceipt`.

### 5. Cập nhật read receipt
- Sự kiện `chat:read` cập nhật `chat_message_receipt` và `chat_participant.lastReadMessageId`, sau đó broadcast cho những người khác biết mốc đọc mới.

## Lợi ích

- **Realtime ổn định**: Redis làm shared state nên nhiều instance Socket.IO vẫn giữ được presence/typing nhất quán.
- **Khả năng mở rộng**: các trạng thái tạm thời (typing, queue, rate limit) không làm nặng MySQL, dễ scale ngang.
- **Phục vụ dispute**: mọi tin nhắn vẫn lưu ở MySQL với receipts đầy đủ, admin có thể mở và xem lại lịch sử.
- **Analytics nhanh**: Redis Stream lưu log ngắn hạn, có thể đọc bằng worker để cập nhật dashboard tức thời trước khi đổ về kho lưu trữ dài hạn.

