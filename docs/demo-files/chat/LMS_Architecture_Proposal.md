# LMS Architecture Proposal
## Build Online Learning Platform with Video Streaming

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │  Mobile App  │  │  Admin Panel │          │
│  │  (Next.js)   │  │    (PWA)     │  │  (Next.js)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                               │
│                    (AWS API Gateway)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    NestJS Backend                         │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐           │  │
│  │  │   Auth     │ │  Courses   │ │   Video    │           │  │
│  │  │  Module    │ │  Module    │ │  Module    │           │  │
│  │  └────────────┘ └────────────┘ └────────────┘           │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐           │  │
│  │  │   Quiz     │ │ Analytics  │ │   Users    │           │  │
│  │  │  Module    │ │  Module    │ │  Module    │           │  │
│  │  └────────────┘ └────────────┘ └────────────┘           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │    Redis     │  │ Elasticsearch│          │
│  │  (Primary)   │  │   (Cache)    │  │  (Search)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Video Streaming Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │────▶│     S3      │────▶│ MediaConvert│
│   Video     │     │   (Raw)     │     │ (Transcode) │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Player    │◀────│ CloudFront  │◀────│     S3      │
│   (HLS)     │     │   (CDN)     │     │ (Processed) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  DRM Server │
                    │  (Pallycon) │
                    └─────────────┘
```

### Video Quality Levels:
- 360p (500 kbps) - Mobile/Low bandwidth
- 480p (1000 kbps) - Standard
- 720p (2500 kbps) - HD
- 1080p (5000 kbps) - Full HD

---

## 3. Database Schema (Key Tables)

### Users & Authentication
- `users` - User accounts
- `profiles` - User profiles
- `roles` - Role definitions
- `permissions` - Permission matrix

### Courses & Content
- `courses` - Course information
- `modules` - Course modules
- `lessons` - Individual lessons
- `videos` - Video metadata
- `attachments` - Downloadable files

### Learning & Progress
- `enrollments` - User enrollments
- `progress` - Learning progress
- `quiz_attempts` - Quiz submissions
- `certificates` - Generated certificates

### Analytics
- `video_views` - Video watch events
- `quiz_analytics` - Quiz performance
- `engagement_logs` - User engagement

---

## 4. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | NestJS, GraphQL, Prisma |
| Database | PostgreSQL 15 |
| Cache | Redis |
| Search | Elasticsearch |
| Video | AWS MediaConvert, CloudFront |
| DRM | Pallycon (Widevine + FairPlay) |
| Storage | AWS S3 |
| Auth | JWT + Refresh Token |
| Deployment | AWS ECS, RDS |

---

## 5. Timeline Estimate

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 | 6 weeks | Core LMS, Course Management |
| Phase 2 | 4 weeks | Video Streaming, DRM |
| Phase 3 | 4 weeks | Interactive Content, Assessment |
| Phase 4 | 2 weeks | Testing, Deployment |

**Total: 16 weeks (~4 months)**

---

## 6. Contact

**Freelancer:** Nguyễn Văn A
**Email:** freelancer@demo.com
**Portfolio:** https://portfolio.demo.com
