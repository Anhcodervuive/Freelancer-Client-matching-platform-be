# 🎬 KỊCH BẢN DEMO HỆ THỐNG FREELANCE PLATFORM
## Dự án: Build Online Learning Platform (LMS) with Video Streaming

---

## 📋 THÔNG TIN DỰ ÁN

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên dự án** | Build Online Learning Platform (LMS) with Video Streaming |
| **Budget** | $40,000 |
| **Duration** | 3-6 tháng |
| **Payment Mode** | Single payment project (Fixed price với milestones) |
| **Experience Level** | Expert |
| **Location** | Remote |
| **Skills yêu cầu** | AWS, GraphQL, NestJS, Next.js, TypeScript |

---

## 👥 TÀI KHOẢN DEMO

| Vai trò | Email | Password | Mô tả |
|---------|-------|----------|-------|
| **Client** | client@demo.com | Demo@123 | Người đăng job, thuê freelancer |
| **Freelancer** | freelancer@demo.com | Demo@123 | Người apply và thực hiện dự án |
| **Admin** | admin@demo.com | Demo@123 | Quản trị viên hệ thống |

---

## 🎯 PHẦN 1: FREELANCER APPLY JOB

### 1.1 Nội dung Proposal

**Cover Letter:**
```
Kính gửi Quý khách hàng,

Tôi là một Full-stack Developer với hơn 5 năm kinh nghiệm phát triển các nền tảng EdTech và LMS. Tôi rất hứng thú với dự án "Build Online Learning Platform" của bạn.

📌 Kinh nghiệm liên quan:
• Đã xây dựng 3 hệ thống LMS cho các doanh nghiệp tại Việt Nam
• Có kinh nghiệm với video streaming sử dụng AWS MediaConvert và CloudFront
• Thành thạo Next.js, NestJS, GraphQL, TypeScript

📌 Tại sao chọn tôi:
• Hiểu rõ về SCORM/xAPI standards
• Có kinh nghiệm triển khai DRM protection cho video
• Có thể bắt đầu ngay lập tức

Tôi sẵn sàng trao đổi chi tiết hơn về dự án.

Trân trọng,
Nguyễn Văn A
```

**Bid Amount:** $38,000

### 1.2 Trả lời Screening Questions

**Question 1:** Have you built LMS or EdTech platforms before? Share your experience.
```
Có, tôi đã xây dựng 3 hệ thống LMS:

1. EduPro - Nền tảng đào tạo nội bộ cho công ty 500 nhân viên
   • Tech stack: React, Node.js, PostgreSQL
   • Features: Video courses, quizzes, certificates
   
2. LearnHub - Hệ thống khóa học online với 10,000+ users
   • Tech stack: Next.js, NestJS, MongoDB
   • Features: Live streaming, interactive content
   
3. CorpTraining - LMS cho doanh nghiệp
   • Tech stack: Vue.js, Laravel, MySQL
   • Features: SCORM compliance, detailed analytics
```

**Question 2:** How would you implement video streaming with DRM protection?
```
Tôi sẽ triển khai theo kiến trúc sau:

1. Video Processing Pipeline:
   • Upload video lên S3
   • Trigger AWS MediaConvert để transcode sang HLS/DASH
   • Output multiple bitrates (360p, 480p, 720p, 1080p)

2. DRM Integration:
   • Sử dụng AWS Elemental MediaPackage
   • Tích hợp Widevine (Chrome, Android) và FairPlay (Safari, iOS)
   • License server với Pallycon hoặc BuyDRM

3. Delivery:
   • CloudFront CDN với signed URLs
   • Token-based authentication
   • Geo-restriction nếu cần

4. Security:
   • Encrypted video segments
   • Short-lived tokens (2-4 giờ)
   • Device fingerprinting
```

**Question 3:** Are you familiar with SCORM or xAPI standards? (Optional)
```
Có, tôi đã làm việc với cả hai standards:

SCORM (1.2 và 2004):
• Implement SCORM wrapper cho custom content
• Tracking: completion status, score, time spent
• Đã tích hợp với Moodle và custom LMS

xAPI (Tin Can):
• Setup Learning Record Store (LRS)
• Custom statements cho detailed tracking
• Analytics dashboard từ xAPI data
```

---

## 💬 PHẦN 2: PHỎNG VẤN QUA TIN NHẮN

### 2.1 Kịch bản chat

**[10:00] Client:**
```
Chào bạn, cảm ơn bạn đã gửi proposal. Tôi thấy profile của bạn rất phù hợp với dự án. Bạn có thể chia sẻ thêm về kinh nghiệm với video streaming không?
```

**[10:15] Freelancer:**
```
Chào anh/chị, cảm ơn đã liên hệ!

Về video streaming, tôi đã triển khai cho dự án LearnHub với các tính năng:
• Adaptive bitrate streaming (HLS)
• Resume playback từ vị trí đã xem
• Video analytics (watch time, completion rate)
• DRM protection với Widevine

Tôi có thể gửi anh/chị một số tài liệu về architecture mà tôi đã thiết kế.
```

**[10:20] Client:**
```
Tuyệt vời! Bạn gửi tài liệu đi nhé. Ngoài ra, bạn có thể estimate timeline cho từng phase không?
```

**[10:25] Freelancer:** *(Gửi file)*
```
📎 LMS_Architecture_Proposal.pdf
📎 Video_Streaming_Technical_Spec.docx

Đây là tài liệu về kiến trúc hệ thống và technical spec cho video streaming mà tôi đề xuất. Anh/chị xem qua nhé!
```

**[10:30] Freelancer:**
```
Về timeline, tôi đề xuất như sau:

Phase 1 (6 tuần): Core LMS + Course Management
Phase 2 (4 tuần): Video Streaming + DRM  
Phase 3 (4 tuần): User Management + Analytics
Phase 4 (2 tuần): Testing + Deployment

Tổng: 16 tuần (~4 tháng)
```

**[10:45] Client:** *(Gửi file)*
```
📎 Project_Requirements_Detail.xlsx

Tôi gửi bạn file requirements chi tiết. Bạn review và confirm lại timeline nhé.
```

**[11:00] Freelancer:**
```
Tôi đã xem qua requirements. Có một số điểm cần clarify:

1. SSO integration - cần hỗ trợ những provider nào ngoài SAML?
2. Mobile app - có cần native app hay PWA là đủ?
3. White-labeling - mức độ customization như thế nào?

Nếu anh/chị có thời gian, mình có thể call nhanh 15 phút để discuss không?
```

**[11:15] Client:** *(Gửi file)*
```
📎 Brand_Guidelines.pdf

OK, mình call lúc 2PM nhé. Tôi sẽ gửi meeting link.
Đây là brand guidelines cho white-labeling, bạn tham khảo trước.
```

**[14:30] Client:**
```
Cuộc gọi rất productive! Tôi sẽ gửi offer cho bạn với các terms đã thảo luận.
```

**[14:35] Freelancer:**
```
Cảm ơn anh/chị! Tôi rất mong được hợp tác. Sẽ chờ offer từ anh/chị.
```

---

## 📝 PHẦN 3: TẠO HỢP ĐỒNG VÀ MILESTONES

### 3.1 Thông tin Contract

| Field | Value |
|-------|-------|
| **Title** | Build Online Learning Platform (LMS) with Video Streaming |
| **Total Value** | $38,000 USD |
| **Start Date** | [Ngày demo] |
| **End Date** | [Ngày demo + 4 tháng] |

### 3.2 Chi tiết 6 Milestones

#### Milestone 1: Core LMS Foundation & Course Management
| Field | Value |
|-------|-------|
| **Title** | Core LMS Foundation & Course Management |
| **Amount** | $8,000 |
| **Duration** | 3 tuần |
| **Description** | Xây dựng nền tảng LMS cơ bản bao gồm: Database schema design với PostgreSQL, Authentication system (JWT + refresh token), Course CRUD operations, Content organization (modules, lessons, sections), Basic admin dashboard với Next.js |

#### Milestone 2: Video Streaming Infrastructure
| Field | Value |
|-------|-------|
| **Title** | Video Streaming Infrastructure |
| **Amount** | $10,000 |
| **Duration** | 4 tuần |
| **Description** | Triển khai hệ thống video streaming: AWS MediaConvert integration cho video transcoding, CloudFront CDN setup với signed URLs, HLS adaptive streaming (360p, 480p, 720p, 1080p), Video upload với progress tracking và background processing, Resume playback functionality với timestamp tracking |

#### Milestone 3: DRM Protection & Security
| Field | Value |
|-------|-------|
| **Title** | DRM Protection & Security |
| **Amount** | $6,000 |
| **Duration** | 2 tuần |
| **Description** | Implement bảo mật video: Widevine DRM integration cho Chrome/Android, FairPlay DRM cho Safari/iOS, License server setup với Pallycon, Signed URLs với expiration, Token-based access control, Anti-screen recording measures |

#### Milestone 4: Interactive Content & Assessment
| Field | Value |
|-------|-------|
| **Title** | Interactive Content & Assessment |
| **Amount** | $7,000 |
| **Duration** | 3 tuần |
| **Description** | Phát triển tính năng tương tác: Quiz system với multiple question types (MCQ, True/False, Fill-in), Assignments submission và grading, Discussion forums per course/lesson, Progress tracking với completion percentage, SCORM 2004 compliance, xAPI integration với LRS |

#### Milestone 5: User Management & Analytics
| Field | Value |
|-------|-------|
| **Title** | User Management & Analytics |
| **Amount** | $5,000 |
| **Duration** | 2 tuần |
| **Description** | Hoàn thiện hệ thống: User roles & permissions (Admin, Instructor, Student), Bulk enrollment via CSV import, Learning analytics dashboard (engagement, completion rates, scores), Certificate generation với PDF export, Reporting system với export Excel/PDF |

#### Milestone 6: Testing, Deployment & Documentation
| Field | Value |
|-------|-------|
| **Title** | Testing, Deployment & Documentation |
| **Amount** | $2,000 |
| **Duration** | 2 tuần |
| **Description** | Finalize dự án: End-to-end testing với Cypress, Performance optimization và load testing, AWS deployment (ECS, RDS, S3, CloudFront), CI/CD pipeline với GitHub Actions, Technical documentation, Admin user guide, Knowledge transfer session |

---

## 📤 PHẦN 4: SUBMIT MILESTONE

### 4.1 Milestone 1 Submission

**Message:**
```
Chào anh/chị,

Tôi đã hoàn thành Milestone 1 - Core LMS Foundation & Course Management. 

✅ Deliverables:
• Database schema với 25+ tables (users, courses, modules, lessons, enrollments...)
• Authentication system hoàn chỉnh (JWT + refresh token + password reset)
• Course management CRUD với drag-drop reordering
• Admin dashboard với statistics overview
• API documentation với Swagger

📎 Files đính kèm:
• database_schema_v1.sql
• api_documentation.pdf  
• admin_dashboard_screenshots.zip
• deployment_guide.md
• test_accounts.txt

🔗 Demo:
• Staging URL: https://staging.lms-demo.com
• Admin: admin@test.com / Test@123

Anh/chị vui lòng review và cho feedback nhé!
```

### 4.2 Milestone 2 Submission

**Message:**
```
Milestone 2 - Video Streaming Infrastructure đã hoàn thành!

✅ Deliverables:
• AWS MediaConvert pipeline tự động transcode
• CloudFront distribution với 4 edge locations
• HLS streaming với 4 quality levels (360p, 480p, 720p, 1080p)
• Video upload với progress bar và background processing
• Resume playback - tự động lưu và restore vị trí xem

📎 Files đính kèm:
• video_streaming_architecture.pdf
• aws_infrastructure_diagram.png
• video_player_demo.mp4
• performance_test_results.xlsx
• cloudfront_config.json

🔗 Demo:
• Upload test video và xem kết quả transcoding
• Test adaptive bitrate bằng cách throttle network
• Test resume playback

Anh/chị có thể test trực tiếp trên staging!
```

---

## ⚠️ PHẦN 5: KỊCH BẢN TRANH CHẤP (Milestone 2)

### 5.1 Mở Dispute (Client)

**Dispute Title:**
```
Video Streaming không đạt yêu cầu - Milestone 2
```

**Dispute Reason:**
```
Tôi mở tranh chấp cho Milestone 2 - Video Streaming Infrastructure vì các lý do sau:

❌ VẤN ĐỀ 1: Adaptive Bitrate Streaming không hoạt động
• Video chỉ có 1 quality level (720p), không có 360p, 480p, 1080p như cam kết
• Khi throttle network, video bị buffer liên tục thay vì chuyển quality
• Đã test trên Chrome, Firefox, Safari đều cùng kết quả

❌ VẤN ĐỀ 2: Video Upload có vấn đề
• Upload video > 500MB bị timeout
• Progress bar không chính xác (nhảy từ 30% lên 100%)
• Background processing không có notification khi hoàn thành

❌ VẤN ĐỀ 3: Resume Playback không hoạt động
• Khi refresh trang, video bắt đầu lại từ đầu
• Timestamp không được lưu vào database
• Đã test với nhiều user accounts khác nhau

❌ VẤN ĐỀ 4: CloudFront CDN chưa được setup đúng
• Video load chậm (5-10 giây để bắt đầu play)
• Không thấy cache headers trong response
• Signed URLs không hoạt động

📎 BẰNG CHỨNG ĐÍNH KÈM:
• network_throttle_test.mp4 - Video test adaptive bitrate
• upload_timeout_screenshot.png - Screenshot lỗi upload
• resume_playback_bug.mp4 - Video demo bug resume
• cloudfront_headers.png - Screenshot thiếu cache headers

💰 YÊU CẦU:
Hoàn tiền 50% milestone ($5,000) HOẶC fix hoàn chỉnh tất cả issues trong 1 tuần.
```

### 5.2 Phản hồi Dispute (Freelancer)

**Response:**
```
Tôi xin phản hồi chi tiết về từng điểm tranh chấp:

⚠️ VỀ VẤN ĐỀ 1 - Adaptive Bitrate:
• MediaConvert đã được config output 4 quality levels
• Tuy nhiên, video test của client chỉ có 720p source → không thể upscale lên 1080p
• Các video có source >= 1080p sẽ có đầy đủ 4 levels
• Đây là limitation kỹ thuật, không phải bug

📎 Bằng chứng: mediaconvert_job_config.png, hls_manifest_sample.m3u8

✅ VỀ VẤN ĐỀ 2 - Video Upload:
• Upload 500MB+ cần config timeout phía client
• Tôi đã gửi hướng dẫn config nginx timeout trong documentation
• Progress bar issue đã được fix trong commit ngày 20/12

📎 Bằng chứng: upload_fix_commit.png, nginx_config_guide.pdf

⚠️ VỀ VẤN ĐỀ 3 - Resume Playback:
• Feature này hoạt động đúng trên staging environment
• Có thể client test trên local mà chưa config đúng API endpoint
• Cần verify lại environment của client

📎 Bằng chứng: resume_playback_working.mp4, database_timestamp_records.png

✅ VỀ VẤN ĐỀ 4 - CloudFront:
• CloudFront đã setup với 4 edge locations
• Cache headers có trong response (Cache-Control, X-Cache)
• Signed URLs hoạt động - có thể client copy URL sau khi expired

📎 Bằng chứng: cloudfront_distribution_config.png, signed_url_test.mp4

💡 ĐỀ XUẤT GIẢI QUYẾT:
1. Họp online 30 phút để demo trực tiếp trên staging
2. Hỗ trợ client config đúng environment
3. Cung cấp video source 1080p để test adaptive bitrate
```

### 5.3 Đề xuất hòa giải (Mediation Proposal)

**Proposal từ Admin/Mediator:**
```
Sau khi xem xét bằng chứng từ cả hai bên, tôi đề xuất giải pháp hòa giải:

📊 PHÂN TÍCH:

1. Adaptive Bitrate: Freelancer đã implement đúng. Video source 720p không thể có 1080p output - đây là limitation kỹ thuật hợp lý. ✅ Freelancer đúng

2. Video Upload: Timeout là do nginx config, freelancer đã cung cấp guide. Progress bar đã fix. ✅ Freelancer đúng

3. Resume Playback: Cần verify environment. Staging hoạt động đúng. ⚠️ Cần kiểm tra thêm

4. CloudFront: Đã setup đúng, signed URLs hoạt động. Client có thể test sai cách. ✅ Freelancer đúng

5. Communication: Freelancer đã gửi documentation nhưng client chưa đọc kỹ. ⚠️ Cả hai cần cải thiện

💰 ĐỀ XUẤT PHÂN CHIA:

• Freelancer nhận: 90% = $9,000
• Client hoàn lại: 10% = $1,000

📋 ĐIỀU KIỆN:

1. Freelancer hỗ trợ client setup environment trong 2 ngày
2. Freelancer cung cấp video hướng dẫn chi tiết
3. Client cung cấp video source 1080p để test
4. Hai bên họp online để demo và verify tất cả features

⏰ Thời hạn phản hồi: 48 giờ
```

### 5.4 Nộp bằng chứng hòa giải (Mediation Evidence Submission)

> 💡 **Lưu ý:** Khi dispute chuyển sang giai đoạn MEDIATION, Admin có thể yêu cầu cả hai bên nộp bằng chứng bổ sung thông qua hệ thống. Tab "Evidence" sẽ xuất hiện trong trang chi tiết dispute.

---

#### 📤 5.4.1 CLIENT nộp bằng chứng

**Bước thực hiện:**
1. Đăng nhập tài khoản **Client** (`client@demo.com`)
2. Vào **Contract Workroom** → Tab **"Disputes"**
3. Click vào dispute đang mở
4. Chọn tab **"Evidence"**
5. Click **"Submit Evidence"**

---

**🖼️ Evidence 1: Screenshot lỗi upload timeout**

| Field | Nội dung nhập |
|-------|---------------|
| Title | `Screenshot lỗi upload timeout` |
| Source Type | `Screenshot` |
| Description | `Screenshot cho thấy lỗi timeout khi upload video 600MB. Lỗi xảy ra sau 2 phút upload, progress bar dừng ở 30%.` |
| File | 📎 `CLIENT_evidence_1_upload_timeout.md` |

---

**🎥 Evidence 2: Video demo bug resume playback**

| Field | Nội dung nhập |
|-------|---------------|
| Title | `Video demo bug resume playback` |
| Source Type | `Screen Recording` |
| Description | `Video ghi lại quá trình test resume playback. Xem video đến 5:30, refresh trang, video bắt đầu lại từ 0:00 thay vì tiếp tục từ 5:30.` |
| File | 📎 `CLIENT_evidence_2_resume_playback_bug.md` |

---

**📄 Evidence 3: Network test adaptive bitrate**

| Field | Nội dung nhập |
|-------|---------------|
| Title | `Network test adaptive bitrate` |
| Source Type | `Document` |
| Description | `Video test adaptive bitrate streaming bằng Chrome DevTools throttling. Khi chuyển sang Slow 3G, video buffer liên tục thay vì switch xuống quality thấp hơn.` |
| File | 📎 `CLIENT_evidence_3_adaptive_bitrate_test.md` |

---

#### 📤 5.4.2 FREELANCER nộp bằng chứng

**Bước thực hiện:**
1. Đăng nhập tài khoản **Freelancer** (`freelancer@demo.com`)
2. Vào **Contract Workroom** → Tab **"Disputes"**
3. Click vào dispute đang mở
4. Chọn tab **"Evidence"**
5. Click **"Submit Evidence"**

---

**🖼️ Evidence 1: AWS MediaConvert job configuration**

| Field | Nội dung nhập |
|-------|---------------|
| Title | `AWS MediaConvert job configuration` |
| Source Type | `Screenshot` |
| Description | `Screenshot cấu hình AWS MediaConvert job template với 4 output presets (360p, 480p, 720p, 1080p). Chứng minh adaptive bitrate đã được config đúng.` |
| File | 📎 `FREELANCER_evidence_1_mediaconvert_config.md` |

---

**🎥 Evidence 2: Demo resume playback hoạt động trên staging**

| Field | Nội dung nhập |
|-------|---------------|
| Title | `Demo resume playback hoạt động trên staging` |
| Source Type | `Screen Recording` |
| Description | `Video demo resume playback hoạt động đúng trên staging environment. Xem đến 5:30, refresh, video tiếp tục từ 5:30. Database có record timestamp.` |
| File | 📎 `FREELANCER_evidence_2_resume_playback_working.md` |

---

**📄 Evidence 3: CloudFront distribution configuration**

| Field | Nội dung nhập |
|-------|---------------|
| Title | `CloudFront distribution configuration` |
| Source Type | `Document` |
| Description | `Screenshot cấu hình CloudFront distribution với cache headers, signed URLs, và 4 edge locations. Response headers có X-Cache: Hit from cloudfront.` |
| File | 📎 `FREELANCER_evidence_3_cloudfront_config.md` |

---

#### 👨‍💼 5.4.3 ADMIN xem và đánh giá bằng chứng

**Bước thực hiện:**
1. Đăng nhập tài khoản **Admin** (`admin@demo.com`)
2. Vào **Admin Panel** → **Disputes**
3. Click vào dispute cần xử lý
4. Chọn tab **"Evidence"**
5. Xem tất cả bằng chứng từ cả hai bên
6. Đánh giá và tạo **Mediation Proposal**

---

**Giao diện Admin Evidence Review:**

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 DISPUTE EVIDENCE - DSP-2024-001                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  👤 CLIENT EVIDENCE (3 items)                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🖼️ Screenshot lỗi upload timeout                        │   │
│  │    └── CLIENT_evidence_1_upload_timeout.md              │   │
│  │                                                          │   │
│  │ 🎥 Video demo bug resume playback                        │   │
│  │    └── CLIENT_evidence_2_resume_playback_bug.md         │   │
│  │                                                          │   │
│  │ 📄 Network test adaptive bitrate                         │   │
│  │    └── CLIENT_evidence_3_adaptive_bitrate_test.md       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  👤 FREELANCER EVIDENCE (3 items)                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🖼️ AWS MediaConvert job configuration                   │   │
│  │    └── FREELANCER_evidence_1_mediaconvert_config.md     │   │
│  │                                                          │   │
│  │ 🎥 Demo resume playback hoạt động                        │   │
│  │    └── FREELANCER_evidence_2_resume_playback_working.md │   │
│  │                                                          │   │
│  │ 📄 CloudFront distribution configuration                 │   │
│  │    └── FREELANCER_evidence_3_cloudfront_config.md       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [📝 Create Proposal]                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Sau khi xem xét bằng chứng:**
1. Admin click **"Create Proposal"** để tạo đề xuất hòa giải
2. Nhập nội dung proposal như mục 5.3
3. Chọn tỷ lệ phân chia: **Freelancer 90%**, **Client 10%**
4. Submit proposal cho cả hai bên review

---

## 📁 PHẦN 6: DANH SÁCH FILES CẦN CHUẨN BỊ

### 6.1 Files gửi trong Chat (Demo tính năng gửi file)

| File | Kích thước | Mục đích |
|------|------------|----------|
| `LMS_Architecture_Proposal.pdf` | ~500KB | Demo gửi PDF |
| `Video_Streaming_Technical_Spec.docx` | ~300KB | Demo gửi Word |
| `Project_Requirements_Detail.xlsx` | ~200KB | Demo gửi Excel |
| `Brand_Guidelines.pdf` | ~1MB | Demo gửi file lớn |
| `System_Diagram.png` | ~500KB | Demo gửi hình ảnh |

### 6.2 Files cho Milestone Submission

| Milestone | Files cần chuẩn bị |
|-----------|-------------------|
| MS1 | `database_schema_v1.sql`, `api_documentation.pdf`, `admin_screenshots.zip`, `test_accounts.txt` |
| MS2 | `video_architecture.pdf`, `aws_diagram.png`, `video_demo.mp4`, `performance_results.xlsx` |
| MS3 | `drm_setup_guide.pdf`, `security_audit_report.pdf`, `license_server_config.json` |
| MS4 | `quiz_system_demo.mp4`, `scorm_compliance_report.pdf`, `xapi_statements_sample.json` |
| MS5 | `analytics_dashboard.png`, `user_management_guide.pdf`, `certificate_template.pdf` |
| MS6 | `final_documentation.pdf`, `deployment_checklist.xlsx`, `knowledge_transfer_slides.pptx` |

### 6.3 Files cho Dispute Evidence (Milestone 2)

| Bên | Files |
|-----|-------|
| **Client** | `network_throttle_test.mp4`, `upload_timeout_screenshot.png`, `resume_playback_bug.mp4`, `cloudfront_headers.png` |
| **Freelancer** | `mediaconvert_job_config.png`, `upload_fix_commit.png`, `resume_playback_working.mp4`, `cloudfront_distribution_config.png` |

### 6.4 Files cho Mediation Evidence Submission

> 📁 **Thư mục:** `docs/demo-files/mediation-evidence/`

| Bên | File | Source Type | Mô tả |
|-----|------|-------------|-------|
| **Client** | `CLIENT_evidence_1_upload_timeout.md` | Screenshot | Lỗi timeout upload 600MB |
| **Client** | `CLIENT_evidence_2_resume_playback_bug.md` | Screen Recording | Demo bug resume playback |
| **Client** | `CLIENT_evidence_3_adaptive_bitrate_test.md` | Document | Test adaptive bitrate |
| **Freelancer** | `FREELANCER_evidence_1_mediaconvert_config.md` | Screenshot | Config AWS MediaConvert |
| **Freelancer** | `FREELANCER_evidence_2_resume_playback_working.md` | Screen Recording | Demo resume hoạt động |
| **Freelancer** | `FREELANCER_evidence_3_cloudfront_config.md` | Document | Config CloudFront CDN | |
| **Freelancer** | `cloudfront_distribution_config.png` | Document | Config CloudFront CDN |

---

## 🎥 THỨ TỰ DEMO

### Flow 1: Happy Path (Không có tranh chấp)
1. Client đăng job
2. Freelancer xem job và submit proposal
3. Client review proposal, chat với freelancer
4. Client gửi offer
5. Freelancer accept offer → Tạo contract
6. Freelancer submit milestone 1
7. Client approve và release payment
8. Hoàn thành milestone 1
9. Cả hai để lại review (nếu cần)

### Flow 2: Dispute Path (Milestone 2)
1. Thực hiện bước 1-8 như trên (hoàn thành Milestone 1)
2. Freelancer submit Milestone 2
3. Client reject milestone với lý do (video streaming issues)
4. Freelancer submit lại với giải thích
5. Client vẫn không hài lòng → Mở dispute
6. Freelancer phản hồi dispute với bằng chứng
7. Admin tham gia hòa giải (sau khi 2 bên không tự giải quyết được)
8. **Client nộp bằng chứng qua tab Evidence** (3 items)
9. **Freelancer nộp bằng chứng qua tab Evidence** (3 items)
10. **Admin xem xét bằng chứng từ cả hai bên**
11. Admin đề xuất mediation proposal
12. Cả hai accept → Resolve dispute

---

## 📞 LIÊN HỆ HỖ TRỢ

Nếu cần hỗ trợ trong quá trình demo, liên hệ:
- Email: support@demo.com
- Hotline: 1900-xxxx
