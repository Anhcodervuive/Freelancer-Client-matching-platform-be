# DISPUTE EVIDENCE - CLIENT SIDE
## Milestone 3: DRM Protection & Security

---

## 📋 DISPUTE TITLE
**DRM Protection không hoạt động đúng theo yêu cầu - Milestone 3**

---

## ❌ VẤN ĐỀ 1: Widevine DRM không hoạt động trên Chrome

### Mô tả:
Video vẫn có thể download được bằng browser extension (Video DownloadHelper). Điều này cho thấy DRM chưa được implement đúng cách.

### Bằng chứng:
- File: `video_download_proof.mp4`
- Mô tả: Screen recording cho thấy quá trình download video bằng extension
- Thời gian test: 20/12/2024, 14:30
- Browser: Chrome 120.0.6099.130
- OS: Windows 11

### Expected behavior:
- Video phải được encrypt và không thể download
- Nếu download được thì file phải không playable

---

## ❌ VẤN ĐỀ 2: Signed URLs có thể bypass

### Mô tả:
Copy URL video và mở trong incognito window vẫn play được. URL không expire sau thời gian quy định (2 giờ).

### Bằng chứng:
- File: `url_bypass_screenshot.png`
- Mô tả: Screenshot cho thấy URL vẫn work sau 24 giờ
- Test steps:
  1. Copy video URL lúc 10:00 ngày 19/12
  2. Mở URL trong incognito lúc 10:00 ngày 20/12
  3. Video vẫn play bình thường

### Expected behavior:
- URL phải expire sau 2 giờ
- Mở trong incognito phải yêu cầu authentication

---

## ❌ VẤN ĐỀ 3: Thiếu tính năng đã cam kết

### 3.1 FairPlay cho Safari/iOS
- Đã test trên iPhone 14 Pro, iOS 17.2
- Safari hiển thị lỗi: "This video format is not supported"
- File: `safari_error_screenshot.png`

### 3.2 Watermarking
- Trong requirements document (page 12) có yêu cầu watermarking
- Hiện tại video không có watermark
- File: `original_requirements.pdf` (highlight page 12)

### 3.3 Anti-screen recording
- Không có warning khi screen record
- Không có blackout khi detect screen recording

---

## ❌ VẤN ĐỀ 4: Documentation không đầy đủ

### Thiếu:
- Hướng dẫn configure DRM license server
- Troubleshooting guide cho common issues
- API documentation cho DRM endpoints

### Đã nhận:
- Chỉ có basic setup guide (2 trang)
- Không có chi tiết về license server configuration

---

## 💰 YÊU CẦU

### Option 1: Hoàn tiền 50%
- Số tiền: $3,000 (50% của $6,000)
- Lý do: Chỉ ~50% requirements được hoàn thành

### Option 2: Fix hoàn chỉnh
- Deadline: 1 tuần từ ngày dispute
- Scope: Fix tất cả 4 vấn đề trên
- Verification: Client sẽ test lại sau khi fix

---

## 📎 DANH SÁCH FILES ĐÍNH KÈM

| # | File Name | Description | Size |
|---|-----------|-------------|------|
| 1 | video_download_proof.mp4 | Screen recording download video | 15 MB |
| 2 | url_bypass_screenshot.png | Screenshot URL work sau 24h | 500 KB |
| 3 | safari_error_screenshot.png | Lỗi trên Safari iOS | 300 KB |
| 4 | original_requirements.pdf | Requirements ban đầu | 2 MB |
| 5 | chrome_network_tab.png | Network tab không có license request | 400 KB |

---

## 📅 TIMELINE

| Date | Event |
|------|-------|
| 01/12/2024 | Milestone 3 started |
| 15/12/2024 | First submission |
| 16/12/2024 | Client feedback - issues found |
| 18/12/2024 | Second submission |
| 19/12/2024 | Client test - issues still exist |
| 20/12/2024 | Dispute opened |

---

**Submitted by:** Client Name
**Date:** 20/12/2024
**Dispute ID:** DSP-2024-001
