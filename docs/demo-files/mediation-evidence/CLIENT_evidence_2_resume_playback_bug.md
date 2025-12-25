# 🎥 BẰNG CHỨNG #2 - CLIENT
## Video demo bug resume playback

---

### Thông tin bằng chứng

| Field | Value |
|-------|-------|
| **Dispute ID** | DSP-2024-001 |
| **Submitted by** | Client |
| **Source Type** | Screen Recording |
| **Date** | 20/12/2024 |

---

### Tiêu đề
**Video demo bug resume playback**

---

### Mô tả chi tiết

Video ghi lại quá trình test tính năng resume playback. Khi xem video đến phút 5:30 rồi refresh trang, video bắt đầu lại từ 0:00 thay vì tiếp tục từ vị trí đã xem.

**Expected behavior:**
- Xem video đến 5:30
- Refresh trang (F5)
- Video tiếp tục từ 5:30

**Actual behavior:**
- Xem video đến 5:30
- Refresh trang (F5)
- Video bắt đầu lại từ 0:00

---

### Timeline của Screen Recording

| Timestamp | Action | Result |
|-----------|--------|--------|
| 0:00 | Mở trang course video | Video player load |
| 0:05 | Click play | Video bắt đầu từ 0:00 |
| 0:10 | Seek đến 5:30 | Video nhảy đến 5:30 |
| 0:15 | Xem video 10 giây | Video đang play ở 5:40 |
| 0:25 | Nhấn F5 refresh | Trang reload |
| 0:30 | Trang load xong | Video player hiện lại |
| 0:35 | Kiểm tra position | ❌ Video ở 0:00, không phải 5:30 |
| 0:40 | Mở DevTools > Network | Không thấy API call save position |
| 0:50 | Check database | Không có record trong video_progress |

---

### Test với nhiều accounts

| Account | Test Result |
|---------|-------------|
| student1@test.com | ❌ Resume không hoạt động |
| student2@test.com | ❌ Resume không hoạt động |
| instructor@test.com | ❌ Resume không hoạt động |

---

### Network Tab Analysis

```
# Không thấy API call nào đến endpoint save position

Expected calls:
- POST /api/videos/{id}/position (mỗi 10 giây)
- GET /api/videos/{id}/playback (khi load page)

Actual calls:
- GET /api/videos/{id}/playback ✅
- POST /api/videos/{id}/position ❌ (không có)
```

---

### Database Check

```sql
-- Query kiểm tra video_progress table
SELECT * FROM video_progress 
WHERE user_id = 'student1_id' 
AND video_id = 'test_video_id';

-- Result: 0 rows
-- Không có record nào được lưu
```

---

### Kết luận

Tính năng resume playback không hoạt động. API endpoint save position không được gọi, dẫn đến timestamp không được lưu vào database.

---

**File đính kèm:** `resume_playback_bug.mp4`
