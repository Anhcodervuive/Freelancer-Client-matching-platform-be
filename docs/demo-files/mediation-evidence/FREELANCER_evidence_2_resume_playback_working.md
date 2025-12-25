# 🎥 BẰNG CHỨNG #2 - FREELANCER
## Demo resume playback hoạt động trên staging

---

### Thông tin bằng chứng

| Field | Value |
|-------|-------|
| **Dispute ID** | DSP-2024-001 |
| **Submitted by** | Freelancer |
| **Source Type** | Screen Recording |
| **Date** | 21/12/2024 |

---

### Tiêu đề
**Demo resume playback hoạt động trên staging**

---

### Mô tả chi tiết

Video demo tính năng resume playback hoạt động đúng trên staging environment. Xem video đến 5:30, refresh trang, video tiếp tục từ 5:30. Database có record timestamp được lưu đúng.

---

### Timeline của Screen Recording

| Timestamp | Action | Result |
|-----------|--------|--------|
| 0:00 | Mở staging URL | https://staging.lms-demo.com |
| 0:05 | Login với student@test.com | Login thành công |
| 0:10 | Mở course video | Video player load |
| 0:15 | Click play | Video bắt đầu từ 0:00 |
| 0:20 | Seek đến 5:30 | Video nhảy đến 5:30 |
| 0:25 | Xem video 15 giây | Video đang play ở 5:45 |
| 0:40 | Mở DevTools > Network | Thấy API call POST /position |
| 0:45 | Nhấn F5 refresh | Trang reload |
| 0:50 | Trang load xong | Video player hiện lại |
| 0:55 | Kiểm tra position | ✅ Video ở 5:45 |
| 1:00 | Video tự động play | Tiếp tục từ 5:45 |

---

### Network Tab - API Calls

```
# API calls được ghi nhận trên staging

✅ GET /api/videos/vid_123/playback
   Response: { lastPosition: 345.5, duration: 600 }

✅ POST /api/videos/vid_123/position (mỗi 10 giây)
   Request: { position: 330.0, completed: false }
   Response: { saved: true }

✅ POST /api/videos/vid_123/position
   Request: { position: 340.0, completed: false }
   Response: { saved: true }

✅ POST /api/videos/vid_123/position
   Request: { position: 345.5, completed: false }
   Response: { saved: true }
```

---

### Database Records

```sql
-- Query video_progress table trên staging
SELECT * FROM video_progress 
WHERE user_id = 'student_test_id' 
AND video_id = 'vid_123';

-- Result:
+----+------------------+----------+------------------+-----------+---------------------+
| id | user_id          | video_id | position_seconds | completed | last_watched_at     |
+----+------------------+----------+------------------+-----------+---------------------+
| 1  | student_test_id  | vid_123  | 345.50           | false     | 2024-12-21 10:30:15 |
+----+------------------+----------+------------------+-----------+---------------------+

✅ Record được lưu đúng với position 345.5 giây (5:45)
```

---

### So sánh Staging vs Client Environment

| Aspect | Staging | Client Local |
|--------|---------|--------------|
| API Endpoint | ✅ Configured | ❓ Có thể sai |
| Database | ✅ Connected | ❓ Có thể chưa migrate |
| CORS | ✅ Enabled | ❓ Có thể block |
| Environment vars | ✅ Set | ❓ Có thể thiếu |

---

### Possible Issues với Client Environment

1. **API_BASE_URL không đúng**
   ```env
   # Cần check .env file
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

2. **Database chưa migrate**
   ```bash
   # Cần chạy migration
   npx prisma migrate dev
   ```

3. **CORS blocking**
   ```
   # Check browser console cho CORS errors
   Access-Control-Allow-Origin header missing
   ```

---

### Kết luận

Resume playback hoạt động đúng trên staging environment. Vấn đề có thể do:
1. Client test trên local với config sai
2. API endpoint không đúng
3. Database chưa được migrate

**Đề xuất:** Họp online để verify environment của Client.

---

**File đính kèm:** `resume_playback_working.mp4`
