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

## ⚠️ PHẦN 5: KỊCH BẢN TRANH CHẤP

### 5.1 Mở Dispute (Client)

**Dispute Title:**
```
DRM Protection không hoạt động đúng theo yêu cầu - Milestone 3
```

**Dispute Reason:**
```
Tôi mở tranh chấp cho Milestone 3 - DRM Protection & Security vì các lý do sau:

❌ VẤN ĐỀ 1: Widevine DRM không hoạt động trên Chrome
• Video vẫn có thể download được bằng browser extension (Video DownloadHelper)
• Không thấy license request trong Network tab
• Đã test trên Chrome 120, Windows 11

❌ VẤN ĐỀ 2: Signed URLs có thể bypass
• Copy URL và mở trong incognito vẫn play được
• URL không expire sau thời gian quy định
• Không có IP restriction như đã thỏa thuận

❌ VẤN ĐỀ 3: Thiếu tính năng đã cam kết
• Không có FairPlay cho Safari/iOS (đã test trên iPhone 14)
• Không có watermarking như trong requirements document
• Không có anti-screen recording

❌ VẤN ĐỀ 4: Documentation không đầy đủ
• Thiếu hướng dẫn configure DRM license server
• Không có troubleshooting guide
• API docs cho DRM endpoints không có

📎 BẰNG CHỨNG ĐÍNH KÈM:
• video_download_proof.mp4 - Screen recording download video
• url_bypass_screenshot.png - Screenshot URL vẫn work sau 24h
• original_requirements.pdf - Requirements ban đầu có watermarking
• safari_error_screenshot.png - Lỗi trên Safari

💰 YÊU CẦU:
Hoàn tiền 50% milestone ($3,000) HOẶC fix hoàn chỉnh tất cả issues trong 1 tuần.
```

### 5.2 Phản hồi Dispute (Freelancer)

**Response:**
```
Tôi xin phản hồi chi tiết về từng điểm tranh chấp:

✅ VỀ VẤN ĐỀ 1 - Widevine DRM:
• DRM đã được implement đúng với Pallycon license server
• Video DownloadHelper chỉ download encrypted segments, KHÔNG thể play
• License request có trong Network tab, filter "license" để thấy
• Đã test thành công trên Chrome 119, 120, 121

📎 Bằng chứng: drm_license_request_screenshot.png

✅ VỀ VẤN ĐỀ 2 - Signed URLs:
• URLs được config expire sau 2 giờ (7200 seconds)
• Test của client có thể sai timezone hoặc cache
• IP restriction KHÔNG có trong scope ban đầu - xem contract section 3.2

📎 Bằng chứng: signed_url_config.png, original_contract_scope.pdf

⚠️ VỀ VẤN ĐỀ 3 - FairPlay và Watermarking:
• FairPlay cần Apple Developer Certificate từ CLIENT
• Tôi đã request certificate từ ngày 15/12 (2 tuần trước) - chưa nhận được
• Watermarking là feature của Phase 2 (Milestone 5), KHÔNG phải Milestone 3
• Anti-screen recording không có trong requirements ban đầu

📎 Bằng chứng: email_request_certificate.png, milestone_scope_document.pdf

✅ VỀ VẤN ĐỀ 4 - Documentation:
• DRM_Setup_Guide.pdf đã gửi qua email ngày 18/12
• Có thể client chưa check email hoặc vào spam

📎 Bằng chứng: email_sent_proof.png

💡 ĐỀ XUẤT GIẢI QUYẾT:
1. Họp online 30 phút để demo trực tiếp DRM functionality
2. Client cung cấp Apple Certificate để implement FairPlay
3. Clarify scope cho watermarking (Milestone 5)
```

### 5.3 Đề xuất hòa giải (Mediation Proposal)

**Proposal từ Admin/Mediator:**
```
Sau khi xem xét bằng chứng từ cả hai bên, tôi đề xuất giải pháp hòa giải:

📊 PHÂN TÍCH:

1. Widevine DRM: Freelancer đã implement đúng. Video download bằng extension là encrypted, không playable. ✅ Freelancer đúng

2. Signed URLs: Config đúng 2 giờ. IP restriction không trong scope. ✅ Freelancer đúng

3. FairPlay: Cần certificate từ Client, đã request nhưng chưa nhận. ⚠️ Pending từ Client

4. Watermarking: Đúng là thuộc Milestone 5, không phải Milestone 3. ✅ Freelancer đúng

5. Documentation: Đã gửi nhưng communication issue. ⚠️ Cả hai cần cải thiện

💰 ĐỀ XUẤT PHÂN CHIA:

• Freelancer nhận: 85% = $5,100
• Client hoàn lại: 15% = $900

📋 ĐIỀU KIỆN:

1. Freelancer bổ sung documentation trong 3 ngày làm việc
2. Client cung cấp Apple Developer Certificate trong 5 ngày
3. Freelancer implement FairPlay trong Milestone 4 (không tính phí thêm)
4. Hai bên họp online để demo và training

⏰ Thời hạn phản hồi: 48 giờ
```

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

### 6.3 Files cho Dispute Evidence

| Bên | Files |
|-----|-------|
| **Client** | `video_download_proof.mp4`, `url_bypass_screenshot.png`, `safari_error.png`, `original_requirements.pdf` |
| **Freelancer** | `drm_test_results.pdf`, `email_certificate_request.png`, `original_scope.pdf`, `documentation_sent_proof.png` |

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
8. Hoàn thành contract
9. Cả hai để lại review

### Flow 2: Dispute Path
1. Thực hiện bước 1-6 như trên
2. Client reject milestone với lý do
3. Freelancer submit lại
4. Client vẫn không hài lòng → Mở dispute
5. Freelancer phản hồi dispute
6. Admin tham gia hòa giải
7. Đề xuất mediation proposal
8. Cả hai accept → Resolve dispute

---

## 📞 LIÊN HỆ HỖ TRỢ

Nếu cần hỗ trợ trong quá trình demo, liên hệ:
- Email: support@demo.com
- Hotline: 1900-xxxx
