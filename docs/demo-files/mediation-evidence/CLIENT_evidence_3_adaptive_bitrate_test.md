# 📄 BẰNG CHỨNG #3 - CLIENT
## Network test adaptive bitrate

---

### Thông tin bằng chứng

| Field | Value |
|-------|-------|
| **Dispute ID** | DSP-2024-001 |
| **Submitted by** | Client |
| **Source Type** | Document |
| **Date** | 20/12/2024 |

---

### Tiêu đề
**Network test adaptive bitrate streaming**

---

### Mô tả chi tiết

Video test adaptive bitrate streaming bằng Chrome DevTools Network Throttling. Khi chuyển sang "Slow 3G", video bị buffer liên tục thay vì tự động switch xuống quality thấp hơn (360p).

**Test Environment:**
- Browser: Chrome 120
- DevTools: Network tab > Throttling
- Video: Course Introduction (10 phút)

---

### Test Procedure

#### Step 1: Normal playback (No throttling)
```
Network: No throttling
Video quality: 720p
Buffering: None
Result: ✅ Video plays smoothly
```

#### Step 2: Enable Slow 3G throttling
```
Network: Slow 3G (400kbps)
Expected: Video should switch to 360p
Actual: Video stays at 720p, constant buffering
Result: ❌ No quality switch
```

#### Step 3: Check HLS manifest
```
GET /videos/vid_123/master.m3u8

Response:
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p/playlist.m3u8

❌ Only 720p available, missing 360p, 480p, 1080p
```

---

### Expected HLS Manifest

```m3u8
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
480p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p/playlist.m3u8
```

---

### Actual HLS Manifest

```m3u8
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p/playlist.m3u8
```

**Chỉ có 1 quality level (720p), thiếu 3 levels còn lại.**

---

### Buffering Timeline (Slow 3G)

| Time | Event |
|------|-------|
| 0:00 | Video starts |
| 0:03 | Buffering... |
| 0:08 | Play 2 seconds |
| 0:10 | Buffering... |
| 0:18 | Play 3 seconds |
| 0:21 | Buffering... |
| ... | Continuous buffering pattern |

---

### Video Player Console

```javascript
// HLS.js logs
[HLS] Loading master playlist
[HLS] Master playlist loaded, 1 level(s) found
[HLS] Level 0: 720p, 2800kbps
[HLS] No lower quality available for bandwidth adaptation
[HLS] Current bandwidth: 400kbps, required: 2800kbps
[HLS] Buffer stalled, waiting for data...
```

---

### Kết luận

Adaptive bitrate streaming không hoạt động vì:
1. HLS manifest chỉ có 1 quality level (720p)
2. Thiếu 360p, 480p, 1080p như đã cam kết
3. Video không thể switch quality khi network chậm
4. User experience bị ảnh hưởng nghiêm trọng

---

**File đính kèm:** `network_throttle_test.mp4`
