# DISPUTE EVIDENCE - CLIENT SIDE
## Milestone 2: Video Streaming Infrastructure

---

## 📋 DISPUTE TITLE
**Video Streaming không đạt yêu cầu - Milestone 2**

---

## ❌ VẤN ĐỀ 1: Adaptive Bitrate Streaming không hoạt động

### Mô tả:
Video chỉ có 1 quality level (720p), không có 360p, 480p, 1080p như đã cam kết. Khi throttle network, video bị buffer liên tục thay vì tự động chuyển quality thấp hơn.

### Bằng chứng:
- File: `network_throttle_test.mp4`
- Mô tả: Screen recording test adaptive bitrate với Chrome DevTools throttling
- Test steps:
  1. Mở video trên staging
  2. Bật DevTools > Network > Throttle "Slow 3G"
  3. Video buffer liên tục, không switch quality
- Thời gian test: 20/12/2024, 14:30
- Browser: Chrome 120, Firefox 121

### Expected behavior:
- Video phải có 4 quality levels: 360p, 480p, 720p, 1080p
- Khi network chậm, tự động switch xuống quality thấp hơn

---

## ❌ VẤN ĐỀ 2: Video Upload có vấn đề

### Mô tả:
Upload video lớn (> 500MB) bị timeout. Progress bar không chính xác - nhảy từ 30% lên 100% đột ngột.

### Bằng chứng:
- File: `upload_timeout_screenshot.png`
- Mô tả: Screenshot lỗi "Request timeout" khi upload file 600MB
- Test steps:
  1. Chọn video 600MB để upload
  2. Progress bar chạy đến 30%
  3. Sau 2 phút, hiện lỗi timeout

### Expected behavior:
- Upload video bất kỳ kích thước (đã thỏa thuận hỗ trợ đến 2GB)
- Progress bar hiển thị chính xác tiến trình

---

## ❌ VẤN ĐỀ 3: Resume Playback không hoạt động

### Mô tả:
Khi refresh trang hoặc quay lại video, video bắt đầu lại từ đầu thay vì từ vị trí đã xem.

### Bằng chứng:
- File: `resume_playback_bug.mp4`
- Mô tả: Screen recording demo bug resume playback
- Test steps:
  1. Xem video đến phút 5:30
  2. Refresh trang (F5)
  3. Video bắt đầu lại từ 0:00
  4. Đã test với nhiều user accounts khác nhau

### Expected behavior:
- Timestamp được lưu vào database
- Khi quay lại, video tiếp tục từ vị trí đã xem

---

## ❌ VẤN ĐỀ 4: CloudFront CDN chưa được setup đúng

### Mô tả:
Video load rất chậm (5-10 giây để bắt đầu play). Không thấy cache headers trong response.

### Bằng chứng:
- File: `cloudfront_headers.png`
- Mô tả: Screenshot Network tab không có X-Cache header
- Observations:
  - Không có header `X-Cache: Hit from cloudfront`
  - Response time: 5-10 giây cho video đầu tiên
  - Signed URLs không hoạt động - video public accessible

### Expected behavior:
- Video load trong < 3 giây
- Cache headers present
- Signed URLs với expiration

---

## 💰 YÊU CẦU

### Option 1: Hoàn tiền 50%
- Số tiền: $5,000 (50% của $10,000)
- Lý do: Nhiều features core không hoạt động

### Option 2: Fix hoàn chỉnh
- Deadline: 1 tuần từ ngày dispute
- Scope: Fix tất cả 4 vấn đề trên
- Verification: Client sẽ test lại sau khi fix

---

## 📎 DANH SÁCH FILES ĐÍNH KÈM

| # | File Name | Description | Size |
|---|-----------|-------------|------|
| 1 | network_throttle_test.mp4 | Video test adaptive bitrate | 20 MB |
| 2 | upload_timeout_screenshot.png | Screenshot lỗi upload | 500 KB |
| 3 | resume_playback_bug.mp4 | Video demo bug resume | 15 MB |
| 4 | cloudfront_headers.png | Screenshot thiếu cache headers | 400 KB |

---

## 📅 TIMELINE

| Date | Event |
|------|-------|
| 01/12/2024 | Milestone 2 started |
| 15/12/2024 | First submission |
| 16/12/2024 | Client feedback - issues found |
| 18/12/2024 | Second submission |
| 19/12/2024 | Client test - issues still exist |
| 20/12/2024 | Dispute opened |

---

**Submitted by:** Client Name
**Date:** 20/12/2024
**Dispute ID:** DSP-2024-001
