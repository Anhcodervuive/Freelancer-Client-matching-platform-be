# 📷 BẰNG CHỨNG #1 - FREELANCER
## AWS MediaConvert job configuration

---

### Thông tin bằng chứng

| Field | Value |
|-------|-------|
| **Dispute ID** | DSP-2024-001 |
| **Submitted by** | Freelancer |
| **Source Type** | Screenshot |
| **Date** | 21/12/2024 |

---

### Tiêu đề
**AWS MediaConvert job configuration**

---

### Mô tả chi tiết

Screenshot cấu hình AWS MediaConvert job template với 4 output presets (360p, 480p, 720p, 1080p). Chứng minh adaptive bitrate đã được config đúng theo yêu cầu.

---

### MediaConvert Job Template

```
┌─────────────────────────────────────────────────────────────────┐
│  AWS MediaConvert - Job Template: LMS-HLS-Transcoding          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📁 Output Groups                                               │
│  └── HLS Group                                                  │
│      ├── Segment length: 6 seconds                             │
│      ├── Playlist type: VOD                                    │
│      └── Outputs:                                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Output 1: 360p                                          │   │
│  │ Resolution: 640x360                                     │   │
│  │ Bitrate: 800 kbps                                       │   │
│  │ Codec: H.264                                            │   │
│  │ Profile: Main                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Output 2: 480p                                          │   │
│  │ Resolution: 854x480                                     │   │
│  │ Bitrate: 1400 kbps                                      │   │
│  │ Codec: H.264                                            │   │
│  │ Profile: Main                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Output 3: 720p                                          │   │
│  │ Resolution: 1280x720                                    │   │
│  │ Bitrate: 2800 kbps                                      │   │
│  │ Codec: H.264                                            │   │
│  │ Profile: High                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Output 4: 1080p                                         │   │
│  │ Resolution: 1920x1080                                   │   │
│  │ Bitrate: 5000 kbps                                      │   │
│  │ Codec: H.264                                            │   │
│  │ Profile: High                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Job Template JSON

```json
{
  "Name": "LMS-HLS-Transcoding",
  "Settings": {
    "OutputGroups": [
      {
        "Name": "HLS Group",
        "OutputGroupSettings": {
          "Type": "HLS_GROUP_SETTINGS",
          "HlsGroupSettings": {
            "SegmentLength": 6,
            "MinSegmentLength": 2,
            "ManifestDurationFormat": "INTEGER"
          }
        },
        "Outputs": [
          {
            "NameModifier": "_360p",
            "VideoDescription": {
              "Width": 640,
              "Height": 360,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "Bitrate": 800000,
                  "RateControlMode": "CBR",
                  "CodecProfile": "MAIN"
                }
              }
            }
          },
          {
            "NameModifier": "_480p",
            "VideoDescription": {
              "Width": 854,
              "Height": 480,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "Bitrate": 1400000,
                  "RateControlMode": "CBR",
                  "CodecProfile": "MAIN"
                }
              }
            }
          },
          {
            "NameModifier": "_720p",
            "VideoDescription": {
              "Width": 1280,
              "Height": 720,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "Bitrate": 2800000,
                  "RateControlMode": "CBR",
                  "CodecProfile": "HIGH"
                }
              }
            }
          },
          {
            "NameModifier": "_1080p",
            "VideoDescription": {
              "Width": 1920,
              "Height": 1080,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "Bitrate": 5000000,
                  "RateControlMode": "CBR",
                  "CodecProfile": "HIGH"
                }
              }
            }
          }
        ]
      }
    ]
  }
}
```

---

### Giải thích về Video Source

**Lưu ý quan trọng:** MediaConvert chỉ có thể **downscale** video, không thể **upscale**.

| Source Resolution | Available Outputs |
|-------------------|-------------------|
| 1080p source | 360p, 480p, 720p, 1080p ✅ |
| 720p source | 360p, 480p, 720p ✅ (không có 1080p) |
| 480p source | 360p, 480p ✅ (không có 720p, 1080p) |

**Video test của Client có source 720p** → Chỉ có thể tạo 360p, 480p, 720p. Không thể tạo 1080p từ 720p source vì đây là upscaling - sẽ làm giảm chất lượng video.

---

### Kết luận

MediaConvert đã được config đúng với 4 output presets. Việc thiếu 1080p output là do video source của Client chỉ có 720p resolution, không phải lỗi config.

---

**File đính kèm:** `mediaconvert_job_config.png`
