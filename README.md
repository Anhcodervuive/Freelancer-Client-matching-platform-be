# Nền tảng tuyển dụng & freelance (Backend Node.js)

Backend tổng hợp cho đồ án LVTN, xây dựng nền tảng kết nối khách hàng và freelancer. Dự án sử dụng Node.js + Express, Prisma ORM (MySQL), hàng đợi BullMQ/Redis, Cloudinary/R2 cho media, Stripe cho thanh toán thử nghiệm và Google OAuth.

## 1. Kiến trúc & công nghệ chính

| Thành phần | Mô tả |
| --- | --- |
| Runtime | Node.js (TypeScript, chạy bằng `ts-node`/`nodemon`). |
| Web framework | Express 5, tổ chức theo modules (`controllers`, `services`, `routes`). |
| ORM | Prisma ORM kết nối MySQL. |
| Hàng đợi | BullMQ chạy trên Redis, phục vụ email và match interaction. |
| Realtime | Socket.IO + kênh realtime riêng trong `src/realtime`. |
| Lưu trữ tệp | Cloudinary (ảnh) & Cloudflare R2/S3 (tệp đính kèm). |
| Thanh toán | Stripe API (test mode). |
| Xác thực | JWT (access/refresh token) + Google OAuth 2.0. |
| Email | Nodemailer gửi SMTP. |

## 2. Yêu cầu hệ thống & nền tảng thứ ba

Cài đặt trước khi chạy dự án:

- **Node.js** >= 18 LTS (khuyến nghị 20.x) và `npm`.
- **MySQL** 8.x hoặc dịch vụ tương thích (PlanetScale, Aurora MySQL...).
- **Redis** 6+ để chạy BullMQ và cache.
- **Stripe account** (test mode) để lấy API key.
- **Google Cloud OAuth 2.0** để lấy `CLIENT_ID`, `CLIENT_SECRET` và URL callback.
- **Cloudinary account** (cloud name, API key/secret) nếu cần lưu ảnh.
- **Cloudflare R2 hoặc S3-compatible storage** cho upload tệp (thiết lập endpoint, bucket, access key).
- **SMTP provider** (Gmail App Password, Mailtrap, SES, v.v.) cho email.

## 3. Thiết lập dự án

### 3.1. Chuẩn bị mã nguồn

```bash
# Clone project
$ git clone <repo-url>
$ cd lvtn-node

# Cài dependency
$ npm install
```

### 3.2. Biến môi trường (`.env`)

Tạo file `.env` tại thư mục gốc và cấu hình các biến quan trọng:

```dotenv
# Server
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
DATABASE_URL="mysql://username:password@localhost:3306/lvtn"

# JWT
JWT_SECRET=local-secret
ACCESS_TOKEN_SECRET_SIGNATURE=local-access-secret
ACCESS_TOKEN_LIFE=1h
REFRESH_TOKEN_SECRET_SIGNATURE=local-refresh-secret
REFRESH_TOKEN_LIFE=14d

# Email SMTP
MAIL_USERNAME=example@mail.com
MAIL_PASSWORD=your-smtp-password
MAIL_NAME="LVTN Platform"

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Cloudflare R2 / S3-compatible storage
R2_ACCOUNT_ID=...
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_REGION=auto
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=lvtn-assets
R2_PUBLIC_BASE_URL=https://pub-<account>.r2.dev
R2_JOB_ATTACHMENT_PREFIX=job-posts
R2_MILESTONE_RESOURCE_PREFIX=contract-milestones
R2_FORCE_PATH_STYLE=true

# Stripe
STRIPE_API_KEY=sk_test_...

# Redis / BullMQ
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Tuỳ chọn cho seed
SEED_BATCH_SIZE=500
```

> ⚠️ Ứng dụng sẽ dùng các giá trị mặc định an toàn khi biến trống, nhưng production nên cấu hình đầy đủ.

## 4. Cơ sở dữ liệu Prisma

1. **Generate client:**
   ```bash
   npx prisma generate
   ```
2. **Migration:**
   - Trong môi trường dev (tự tạo migration mới):
     ```bash
     npx prisma migrate dev
     ```
   - Trong môi trường staging/prod (dùng migration có sẵn):
     ```bash
     npx prisma migrate deploy
     ```

3. **Seed dữ liệu:**
   - Seed mặc định (taxonomy kỹ năng, chuyên ngành):
     ```bash
     npx prisma db seed
     ```
   - Seed từng phần (ví dụ chỉ taxonomy):
     ```bash
     npx ts-node prisma/seed/index.ts taxonomy
     ```
   - Các seed bổ sung (ví dụ payment demo) có thể chạy riêng:
     ```bash
     npx ts-node prisma/seed/payment.ts
     ```
   File `prisma/seed/index.ts` đọc tham số command-line nên có thể mở rộng thêm module seed khác.

## 5. Khởi chạy ứng dụng

### 5.1. REST API / Socket server
```bash
npm run dev
```
Command trên chạy `nodemon` với `ts-node` (reload khi thay đổi code). Mặc định server lắng nghe `http://localhost:3000`.

### 5.2. Hàng đợi nền (BullMQ)

Mỗi queue chạy bằng một worker riêng:

```bash
npm run worker:email             # xử lý email
npm run worker:match-interaction # xử lý match suggestion
```

Nên chạy Redis trước khi khởi động workers.

## 6. Cấu trúc thư mục chính

```
src/
 ├─ config/          # cấu hình Prisma, Redis, environment
 ├─ controllers/     # controller Express
 ├─ services/        # business logic
 ├─ routes/          # khai báo routes API
 ├─ queues/          # định nghĩa BullMQ queue + worker
 ├─ realtime/        # Socket.IO namespaces / events
 ├─ utils/, helpers/ # hàm tiện ích dùng chung
prisma/
 ├─ schema.prisma    # schema database
 ├─ migrations/      # lịch sử migration
 └─ seed/            # seed script (taxonomy, payment, ...)
```

## 7. Ghi chú triển khai

- **Bảo mật:** Luôn đặt secret riêng cho JWT và refresh token. Bật HTTPS ở reverse proxy.
- **Storage:** Nếu không cấu hình R2, cần điều chỉnh `src/providers/r2.provider.ts` hoặc mock S3 khi dev.
- **Email:** Có thể sử dụng Mailtrap trong môi trường phát triển để tránh gửi email thật.
- **Queues:** BullMQ cần Redis hoạt động ổn định; cân nhắc cài RedisInsight để theo dõi.
- **Monitoring:** Tích hợp thêm morgan (đã cài) và rate-limit (`express-rate-limit`) khi deploy.

## 8. Troubleshooting

| Lỗi | Cách xử lý |
| --- | --- |
| `P1001: Can't reach database server` | Kiểm tra `DATABASE_URL`, port MySQL, quyền user. |
| Worker/queue không kết nối Redis | Kiểm tra `REDIS_HOST`, `REDIS_PORT`, firewall, authentication. |
| Upload R2 báo thiếu credential | Đảm bảo `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` hợp lệ. |
| Google OAuth callback 404 | Đảm bảo `GOOGLE_CALLBACK_URL` trùng với cấu hình Google Cloud & route backend. |
| Stripe lỗi secret key | Dùng key test bắt đầu bằng `sk_test_...` và bật chế độ test. |

---

Nếu cần thêm seed dữ liệu (client, freelancer, job demo), tạo file mới trong `prisma/seed/` và import vào `index.ts` theo mẫu `seedTaxonomy`.
