# 📁 CHECKLIST FILES CẦN CHUẨN BỊ CHO DEMO

---

## 🎯 MỤC ĐÍCH
Danh sách các files cần chuẩn bị để demo đầy đủ các tính năng của hệ thống Freelance Platform cho luận văn.

---

## 📂 1. FILES GỬI TRONG CHAT

> **Mục đích:** Demo tính năng gửi file trong tin nhắn giữa Client và Freelancer

| # | Tên file | Định dạng | Kích thước | Nội dung |
|---|----------|-----------|------------|----------|
| 1 | `LMS_Architecture_Proposal.pdf` | PDF | ~500KB | Đề xuất kiến trúc hệ thống LMS |
| 2 | `Video_Streaming_Technical_Spec.docx` | Word | ~300KB | Spec kỹ thuật video streaming |
| 3 | `Project_Requirements_Detail.xlsx` | Excel | ~200KB | Chi tiết requirements dự án |
| 4 | `Brand_Guidelines.pdf` | PDF | ~1MB | Hướng dẫn brand cho white-labeling |
| 5 | `System_Architecture_Diagram.png` | Image | ~500KB | Sơ đồ kiến trúc hệ thống |
| 6 | `Meeting_Recording.mp4` | Video | ~10MB | Recording cuộc họp (optional) |

### Cách tạo files:
- **PDF:** Export từ Word hoặc dùng các file .md trong `docs/demo-files/chat/`
- **Excel:** Tạo bảng requirements với các cột: ID, Feature, Priority, Status
- **Image:** Screenshot hoặc dùng draw.io tạo diagram

---

## 📂 2. FILES CHO MILESTONE SUBMISSION

> **Mục đích:** Demo tính năng submit kết quả công việc của Freelancer

### Milestone 1: Core LMS Foundation
| # | Tên file | Mô tả |
|---|----------|-------|
| 1 | `database_schema_v1.sql` | SQL script tạo database |
| 2 | `api_documentation.pdf` | Tài liệu API endpoints |
| 3 | `admin_dashboard_screenshots.zip` | Screenshots giao diện admin |
| 4 | `deployment_guide.md` | Hướng dẫn deploy |
| 5 | `test_accounts.txt` | Danh sách tài khoản test |

### Milestone 2: Video Streaming
| # | Tên file | Mô tả |
|---|----------|-------|
| 1 | `video_streaming_architecture.pdf` | Kiến trúc video streaming |
| 2 | `aws_infrastructure_diagram.png` | Sơ đồ AWS infrastructure |
| 3 | `video_player_demo.mp4` | Demo video player |
| 4 | `performance_test_results.xlsx` | Kết quả test performance |
| 5 | `cloudfront_config.json` | Config CloudFront |

### Milestone 3: DRM Protection
| # | Tên file | Mô tả |
|---|----------|-------|
| 1 | `drm_setup_guide.pdf` | Hướng dẫn setup DRM |
| 2 | `security_audit_report.pdf` | Báo cáo audit bảo mật |
| 3 | `license_server_config.json` | Config license server |
| 4 | `drm_test_results.xlsx` | Kết quả test DRM |

### Milestone 4: Interactive Content
| # | Tên file | Mô tả |
|---|----------|-------|
| 1 | `quiz_system_demo.mp4` | Demo hệ thống quiz |
| 2 | `scorm_compliance_report.pdf` | Báo cáo SCORM compliance |
| 3 | `xapi_statements_sample.json` | Sample xAPI statements |
| 4 | `assessment_user_guide.pdf` | Hướng dẫn sử dụng |

### Milestone 5: User Management & Analytics
| # | Tên file | Mô tả |
|---|----------|-------|
| 1 | `analytics_dashboard_screenshots.zip` | Screenshots analytics |
| 2 | `user_management_guide.pdf` | Hướng dẫn quản lý user |
| 3 | `certificate_template.pdf` | Mẫu certificate |
| 4 | `sample_reports.xlsx` | Báo cáo mẫu |

### Milestone 6: Testing & Deployment
| # | Tên file | Mô tả |
|---|----------|-------|
| 1 | `final_documentation.pdf` | Tài liệu hoàn chỉnh |
| 2 | `deployment_checklist.xlsx` | Checklist deployment |
| 3 | `knowledge_transfer_slides.pptx` | Slides training |
| 4 | `test_report_final.pdf` | Báo cáo test cuối |

---

## 📂 3. FILES CHO DISPUTE EVIDENCE

> **Mục đích:** Demo tính năng tranh chấp và hòa giải

### Bằng chứng từ Client
| # | Tên file | Mô tả |
|---|----------|-------|
| 1 | `video_download_proof.mp4` | Screen recording download video |
| 2 | `url_bypass_screenshot.png` | Screenshot URL không expire |
| 3 | `safari_error_screenshot.png` | Lỗi trên Safari |
| 4 | `original_requirements.pdf` | Requirements ban đầu |
| 5 | `chrome_network_tab.png` | Network tab không có license |

### Bằng chứng từ Freelancer
| # | Tên file | Mô tả |
|---|----------|-------|
| 1 | `drm_license_request_screenshot.png` | Screenshot license request |
| 2 | `downloaded_video_test.mp4` | Video encrypted không play được |
| 3 | `widevine_test_report.pdf` | Test report từ Pallycon |
| 4 | `cloudfront_signed_url_config.png` | Config CloudFront |
| 5 | `email_request_certificate.png` | Email yêu cầu certificate |
| 6 | `milestone_breakdown.pdf` | Chi tiết scope milestone |
| 7 | `email_documentation_sent.png` | Proof đã gửi docs |

---

## 🛠️ HƯỚNG DẪN TẠO FILES

### 1. Tạo PDF từ Markdown
```bash
# Cài đặt pandoc
# Windows: choco install pandoc
# Mac: brew install pandoc

# Convert MD to PDF
pandoc input.md -o output.pdf
```

### 2. Tạo Screenshots
- Dùng Snipping Tool (Windows) hoặc Screenshot (Mac)
- Kích thước khuyến nghị: 1920x1080
- Format: PNG hoặc JPG

### 3. Tạo Video Demo
- Dùng OBS Studio hoặc Loom
- Resolution: 1080p
- Format: MP4
- Độ dài: 1-3 phút mỗi video

### 4. Tạo Excel Files
- Dùng Microsoft Excel hoặc Google Sheets
- Export sang .xlsx
- Bao gồm: headers, data, formatting

### 5. Tạo Diagrams
- Dùng draw.io (diagrams.net)
- Export sang PNG hoặc PDF
- Kích thước: 1200x800 pixels

---

## ✅ CHECKLIST TRƯỚC KHI DEMO

### Files Chat
- [ ] LMS_Architecture_Proposal.pdf
- [ ] Video_Streaming_Technical_Spec.docx
- [ ] Project_Requirements_Detail.xlsx
- [ ] Brand_Guidelines.pdf
- [ ] System_Architecture_Diagram.png

### Files Milestone 1
- [ ] database_schema_v1.sql
- [ ] api_documentation.pdf
- [ ] admin_dashboard_screenshots.zip
- [ ] test_accounts.txt

### Files Milestone 2
- [ ] video_streaming_architecture.pdf
- [ ] aws_infrastructure_diagram.png
- [ ] video_player_demo.mp4

### Files Dispute - Client
- [ ] video_download_proof.mp4
- [ ] url_bypass_screenshot.png
- [ ] original_requirements.pdf

### Files Dispute - Freelancer
- [ ] drm_license_request_screenshot.png
- [ ] email_request_certificate.png
- [ ] milestone_breakdown.pdf

---

## 📍 VỊ TRÍ LƯU FILES

```
lvtn_be/
└── docs/
    └── demo-files/
        ├── chat/                    # Files gửi trong chat
        │   ├── LMS_Architecture_Proposal.md
        │   └── Project_Requirements_Detail.md
        ├── milestone-submissions/   # Files submit milestone
        │   ├── MS1_database_schema.sql
        │   └── MS1_test_accounts.txt
        └── dispute-evidence/        # Files bằng chứng dispute
            ├── CLIENT_dispute_reason.md
            ├── FREELANCER_response.md
            └── MEDIATION_proposal.md
```

---

## 📞 HỖ TRỢ

Nếu cần hỗ trợ tạo files demo:
- Xem các file mẫu trong `docs/demo-files/`
- Sử dụng nội dung từ `DEMO_SCRIPT_LMS_PROJECT.md`

---

**Last Updated:** December 2024
