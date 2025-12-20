# 🎯 HƯỚNG DẪN DEMO LUẬN VĂN - HỆ THỐNG GỢI Ý

## ⚠️ QUAN TRỌNG: Chạy seed trước khi demo

```bash
cd lvtn_be
npm run seed -- ml-diverse
```

**Password cho tất cả tài khoản:** `TestPassword!123`

---

# 📊 THÔNG TIN DỮ LIỆU ĐÃ SEED

## Tổng quan dữ liệu

| Loại | Số lượng | Email Pattern |
|------|----------|---------------|
| Clients | 50 | `ml.diverse.client{1-50}@client.test` |
| Freelancers | 150 | `ml.diverse.freelancer{1-150}@freelancer.test` |
| Jobs | 200 | Đa dạng categories, 4-7 skills mỗi job |
| Interactions | ~500 | Views, Saves, Applies, Invites |

## Categories & Specialties (15 categories, 40+ specialties)

| Category | Specialties |
|----------|-------------|
| Web Development | Frontend, Backend, Fullstack |
| Mobile Development | Cross-platform, Native iOS, Native Android |
| Cloud & DevOps | Infrastructure, Cloud Architecture, Container Platforms, SRE |
| Data Science | Machine Learning, Data Engineering, Business Intelligence |
| AI & Machine Learning | NLP, Computer Vision, LLM Applications |
| Blockchain & Web3 | Smart Contracts, DApp Development, DeFi, NFT |
| E-commerce & CMS | Shopify, WordPress, Headless CMS |
| Cybersecurity | Offensive Security, Defensive Security, Security Operations |
| Quality Assurance | Test Automation, API Testing, Performance Testing |
| Design | UI/UX, Design Systems, UX Research |
| Game Development | Unity, Unreal Engine, VR/AR |
| IoT & Embedded | IoT Development, Embedded Systems |
| Technical Writing | API Documentation, Developer Documentation |

## Freelancer Templates (51 loại profile đa dạng)

| Category | Templates | Primary Skills |
|----------|-----------|----------------|
| Frontend (8) | React, Vue.js, Angular, Next.js, Svelte, Frontend UI/UX, Remix, Astro | React, TypeScript, CSS, Tailwind, etc. |
| Backend (8) | Node.js, NestJS, Python, Go, Java Spring, PHP Laravel, Ruby on Rails, GraphQL | Node.js, PostgreSQL, REST API, etc. |
| Fullstack (4) | Full-Stack JavaScript, MERN Stack, Python Full-Stack, SaaS | React, Node.js, PostgreSQL, etc. |
| Mobile (6) | Flutter, React Native, iOS Swift, Android Kotlin, Ionic, Mobile Fintech | Flutter, Swift, Kotlin, etc. |
| DevOps (4) | DevOps, AWS Cloud, Kubernetes, SRE | Docker, Kubernetes, AWS, Terraform |
| Data/AI (6) | Machine Learning, Deep Learning, NLP, Computer Vision, LLM/AI, Data Engineer | Python, PyTorch, TensorFlow, etc. |
| Blockchain (3) | Solidity, Web3, DeFi | Solidity, ethers.js, Smart Contracts |
| E-commerce (2) | Shopify, WordPress | Shopify, WordPress, PHP |
| Security (2) | Security, Cloud Security | Penetration Testing, AWS Security |
| QA (2) | QA Automation, Performance Testing | Playwright, Cypress, k6 |
| Design (2) | UI/UX, Design Systems | Figma, Prototyping |
| Game Dev (2) | Unity, Unreal | Unity, C#, Unreal, C++ |
| IoT (1) | IoT | Python, MQTT, Arduino |
| Tech Writing (1) | Technical Writer | API Documentation |

## Job Templates (70+ loại job đa dạng)

| Category | Số templates | Ví dụ |
|----------|--------------|-------|
| Frontend | 10 | React Dashboard, Next.js E-commerce, Vue.js SPA, Angular Enterprise, Svelte App, Landing Pages, Component Library, Remix App, Astro Website, PWA |
| Backend | 10 | REST API Node.js, GraphQL Apollo, NestJS Microservices, FastAPI, Django REST, Go Microservices, Spring Boot, Laravel API, Rails API, WebSocket Server |
| Fullstack | 6 | SaaS Application, Booking Platform, Social Platform, Project Management Tool, MERN Stack, Python Full-Stack |
| Mobile | 8 | Flutter App, React Native Expo, iOS SwiftUI, Android Jetpack Compose, Ionic App, Fintech App, Healthcare App, E-commerce App |
| DevOps | 8 | GitHub Actions CI/CD, AWS Terraform, GKE Kubernetes, Prometheus Monitoring, Azure Migration, GitLab CI, ArgoCD GitOps, Jenkins Pipeline |
| Data/AI | 8 | ML Prediction Model, Deep Learning PyTorch, NLP Transformers, Computer Vision, LLM LangChain, Airflow Pipeline, Power BI Dashboard, Recommendation System |
| Blockchain | 4 | Solidity Smart Contracts, DApp React Web3, NFT Marketplace, DeFi Protocol |
| E-commerce | 4 | Shopify Theme, WordPress Plugins, Strapi Headless CMS, WooCommerce Store |
| Security | 4 | Penetration Testing, Security Monitoring, Security Code Review, Cloud Security |
| QA | 4 | Playwright E2E, API Testing, Cypress Suite, Performance Testing |
| Design | 4 | Mobile UI/UX, Design System, UX Research, Web Application UI |
| Game Dev | 4 | Unity Mobile Game, VR Experience, Unreal Engine Game, AR Application |
| IoT | 2 | IoT AWS Solution, Embedded System |
| Tech Writing | 2 | API Documentation, Developer Documentation |

## Đặc điểm dữ liệu mới

✅ **Skills đa dạng:** Mỗi job có 4-7 skills (không chỉ 3 như trước)
✅ **Screening Questions:** Mỗi job có 1-2 câu hỏi sàng lọc
✅ **Language Requirements:** Yêu cầu ngôn ngữ với proficiency level
✅ **Location Types:** REMOTE, HYBRID, ON_SITE
✅ **Budget Range:** Đa dạng từ $2,000 - $80,000
✅ **Experience Levels:** ENTRY, INTERMEDIATE, EXPERT

---

# PHẦN 1: DEMO GỢI Ý FREELANCER CHO CÔNG VIỆC (Client View)

## 📋 Kịch bản 1: Frontend Job → Frontend Freelancers

### Thông tin đăng nhập
- **Email:** `ml.diverse.client1@client.test`
- **Password:** `TestPassword!123`

### Bước thực hiện
1. Đăng nhập với tài khoản Client trên
2. Vào **My Jobs** (Công việc của tôi)
3. Chọn job đầu tiên trong danh sách (hoặc tìm job có title chứa **"dashboard"** hoặc **"frontend"**)
4. Click vào job → Chọn tab **"Invite freelancers"** (Mời freelancer)

### Freelancers sẽ được gợi ý (theo thứ tự ưu tiên)
| Email | Title | Skills Match |
|-------|-------|--------------|
| ml.diverse.freelancer1@... | Senior React Developer | React ✓, TypeScript ✓, CSS ✓ |
| ml.diverse.freelancer3@... | Frontend Engineer \| JavaScript Specialist | JavaScript ✓, React ✓, CSS ✓ |
| ml.diverse.freelancer9@... | Full-Stack Developer \| React | React ✓, TypeScript ✓ |

### Giải thích cho hội đồng
> "Job yêu cầu React, TypeScript, CSS → Hệ thống gợi ý Freelancer có đúng những skills này. Similarity score cao vì skill overlap ratio ~80-100%."

---

## 📋 Kịch bản 2: Backend Job → Backend Freelancers

### Thông tin đăng nhập
- **Email:** `ml.diverse.client5@client.test`
- **Password:** `TestPassword!123`

### Bước thực hiện
1. Đăng nhập với tài khoản Client trên
2. Vào **My Jobs**
3. Chọn job có title chứa **"API"** hoặc **"microservices"**
4. Click vào job → Chọn tab **"Invite freelancers"**

### Freelancers sẽ được gợi ý
| Email | Title | Skills Match |
|-------|-------|--------------|
| ml.diverse.freelancer5@... | Backend Developer \| Node.js Expert | Node.js ✓, PostgreSQL ✓, REST API ✓ |
| ml.diverse.freelancer7@... | Senior API Developer | Node.js ✓, GraphQL ✓, PostgreSQL ✓ |
| ml.diverse.freelancer9@... | Full-Stack Developer \| React | Node.js ✓, PostgreSQL ✓ |

### Giải thích cho hội đồng
> "Job backend yêu cầu Node.js, PostgreSQL → Freelancer backend với đúng skills được xếp hạng cao. Freelancer frontend dù có JavaScript cũng xếp thấp hơn vì thiếu database skills."

---

## 📋 Kịch bản 3: Mobile Job → Mobile Freelancers

### Thông tin đăng nhập
- **Email:** `ml.diverse.client10@client.test`
- **Password:** `TestPassword!123`

### Bước thực hiện
1. Đăng nhập với tài khoản Client trên
2. Vào **My Jobs**
3. Chọn job có title chứa **"mobile"** hoặc **"Flutter"** hoặc **"React Native"**
4. Click vào job → Chọn tab **"Invite freelancers"**

### Freelancers sẽ được gợi ý
| Tier | Email | Title | Lý do |
|------|-------|-------|-------|
| Top | ml.diverse.freelancer13@... | Flutter Developer \| Mobile Specialist | Flutter ✓, REST API ✓ |
| Top | ml.diverse.freelancer15@... | React Native Developer | Cross-platform mobile |
| Second | ml.diverse.freelancer17@... | iOS Developer \| Swift Expert | Cùng domain mobile |
| Second | ml.diverse.freelancer19@... | Android Developer \| Kotlin | Cùng domain mobile |

### Giải thích cho hội đồng
> "Hệ thống hiểu Flutter và React Native đều là cross-platform mobile. iOS/Android developers cũng được gợi ý vì cùng specialty Mobile Development, nhưng score thấp hơn do khác tech stack."

---

## 📋 Kịch bản 4: Data/ML Job → Data Scientists & ML Engineers

### Thông tin đăng nhập
- **Email:** `ml.diverse.client15@client.test`
- **Password:** `TestPassword!123`

### Bước thực hiện
1. Đăng nhập với tài khoản Client trên
2. Vào **My Jobs**
3. Chọn job có title chứa **"ML"** hoặc **"machine learning"** hoặc **"data"**
4. Click vào job → Chọn tab **"Invite freelancers"**

### Freelancers sẽ được gợi ý
| Email Pattern | Title | Skills |
|---------------|-------|--------|
| freelancer với ML template | Machine Learning Engineer | Python, TensorFlow, scikit-learn, Pandas |
| freelancer với Data Science template | Data Scientist \| ML Specialist | Python, Pandas, scikit-learn |
| freelancer với Data Engineer template | Data Engineer \| Pipeline Specialist | Python, SQL, Airflow |

### Giải thích cho hội đồng
> "Job ML yêu cầu Python, TensorFlow → ML Engineers và Data Scientists được gợi ý. Data Engineers cũng xuất hiện vì có Python và SQL overlap."

---

## 📋 Kịch bản 5: DevOps Job → DevOps Engineers

### Thông tin đăng nhập
- **Email:** `ml.diverse.client20@client.test`
- **Password:** `TestPassword!123`

### Bước thực hiện
1. Đăng nhập với tài khoản Client trên
2. Vào **My Jobs**
3. Chọn job có title chứa **"CI/CD"** hoặc **"Kubernetes"** hoặc **"AWS"** hoặc **"cloud"**
4. Click vào job → Chọn tab **"Invite freelancers"**

### Freelancers sẽ được gợi ý
| Email Pattern | Title | Skills |
|---------------|-------|--------|
| freelancer với DevOps template | DevOps Engineer \| Docker | Docker, Terraform, CI/CD, Linux |
| freelancer với Cloud template | Cloud Architect \| AWS/GCP | AWS, Terraform, Kubernetes |
| freelancer với SRE template | SRE \| Platform Engineer | Kubernetes, Docker, Observability |

---

# PHẦN 2: DEMO GỢI Ý CÔNG VIỆC CHO FREELANCER (Freelancer View)

## 📋 Kịch bản 6: Frontend Freelancer tìm việc

### Thông tin đăng nhập
- **Email:** `ml.diverse.freelancer1@freelancer.test`
- **Password:** `TestPassword!123`

### Profile Freelancer này (đã seed)
- **Title:** Senior React Developer
- **Core Skills:** React, TypeScript, CSS, HTML
- **Secondary Skills:** Next.js, Vue, Tailwind, GraphQL, Jest (random 2-4 cái)
- **Specialty:** Frontend Development

### Bước thực hiện
1. Đăng nhập với tài khoản Freelancer trên
2. Vào **Find Jobs** hoặc **Recommended Jobs**

### Jobs sẽ được gợi ý
| Job Title Pattern | Required Skills | Match Reason |
|-------------------|-----------------|--------------|
| Build ... dashboard with React | React, TypeScript, CSS | 100% match |
| Develop ... e-commerce frontend | React, JavaScript, HTML | 75% match |
| Create ... SaaS application | React, Node.js, PostgreSQL | 33% match (chỉ React) |

### Giải thích cho hội đồng
> "Freelancer có React, TypeScript → Hệ thống gợi ý jobs frontend yêu cầu đúng những skills này. Jobs backend dù có TypeScript cũng xếp thấp hơn vì thiếu Node.js trong profile."

---

## 📋 Kịch bản 7: Backend Freelancer tìm việc

### Thông tin đăng nhập
- **Email:** `ml.diverse.freelancer5@freelancer.test`
- **Password:** `TestPassword!123`

### Profile Freelancer này (đã seed)
- **Title:** Backend Developer \| Node.js Expert
- **Core Skills:** Node.js, PostgreSQL, REST API
- **Secondary Skills:** NestJS, Express, Redis, Docker, MongoDB (random 2-4 cái)
- **Specialty:** Backend Development

### Bước thực hiện
1. Đăng nhập với tài khoản Freelancer trên
2. Vào **Find Jobs** hoặc **Recommended Jobs**

### Jobs sẽ được gợi ý
| Job Title Pattern | Required Skills | Match Reason |
|-------------------|-----------------|--------------|
| Design ... REST API for ... | Node.js, PostgreSQL, REST API | 100% match |
| Build ... microservices architecture | Node.js, Docker, Redis | 67-100% match |
| Create ... SaaS application | React, Node.js, PostgreSQL | 67% match |

---

## 📋 Kịch bản 8: ML Engineer tìm việc

### Thông tin đăng nhập
- **Email:** `ml.diverse.freelancer50@freelancer.test` (hoặc freelancer có ML template)
- **Password:** `TestPassword!123`

### Profile Freelancer này (đã seed)
- **Title:** Machine Learning Engineer
- **Core Skills:** Python, TensorFlow, scikit-learn, Pandas
- **Secondary Skills:** PyTorch, Docker, AWS, SQL, NumPy (random 2-4 cái)
- **Specialty:** Machine Learning Engineering

### Bước thực hiện
1. Đăng nhập với tài khoản Freelancer trên
2. Vào **Find Jobs** hoặc **Recommended Jobs**

### Jobs sẽ được gợi ý
| Job Title Pattern | Required Skills | Match Reason |
|-------------------|-----------------|--------------|
| Build ... ML model for ... prediction | Python, scikit-learn, Pandas | 100% match |
| Develop ... recommendation system | Python, TensorFlow, Pandas | 100% match |
| Create ... data pipeline for ... | Python, SQL, Airflow | 50% match (Python, SQL) |

---

## 📋 Kịch bản 9: Fullstack Freelancer tìm việc (Đa dạng gợi ý)

### Thông tin đăng nhập
- **Email:** `ml.diverse.freelancer9@freelancer.test`
- **Password:** `TestPassword!123`

### Profile Freelancer này (đã seed)
- **Title:** Full-Stack Developer \| React
- **Core Skills:** React, Node.js, TypeScript, PostgreSQL
- **Secondary Skills:** Next.js, GraphQL, Docker, Redis, MongoDB (random 2-4 cái)
- **Specialty:** Full-stack Development

### Bước thực hiện
1. Đăng nhập với tài khoản Freelancer trên
2. Vào **Find Jobs** hoặc **Recommended Jobs**

### Jobs sẽ được gợi ý (ĐA DẠNG)
| Job Type | Job Title Pattern | Match Skills |
|----------|-------------------|--------------|
| Fullstack | Create ... SaaS application | React ✓, Node.js ✓, PostgreSQL ✓ |
| Fullstack | Develop ... booking platform | TypeScript ✓, React ✓, Node.js ✓ |
| Frontend | Build ... dashboard with React | React ✓, TypeScript ✓ |
| Backend | Design ... REST API | Node.js ✓, PostgreSQL ✓ |

### Giải thích cho hội đồng
> "Fullstack developer có cả frontend và backend skills nên được gợi ý cả 3 loại jobs. Đây là ưu điểm của Content-Based Filtering - không bị giới hạn bởi specialty mà dựa trên actual skills."

---

# PHẦN 3: GIẢI THÍCH KỸ THUẬT CHO HỘI ĐỒNG

## Công thức Similarity Score

```
similarity_score = 0.2 × sim_FULL + 0.6 × sim_SKILLS + 0.2 × sim_DOMAIN
```

| Thành phần | Trọng số | Ý nghĩa |
|------------|----------|---------|
| sim_FULL | 20% | Cosine similarity giữa job description và freelancer bio |
| sim_SKILLS | 60% | Cosine similarity giữa skill embeddings (QUAN TRỌNG NHẤT) |
| sim_DOMAIN | 20% | Cosine similarity giữa category/specialty |

## Tại sao SKILLS có trọng số 60%?

> "Trong freelancing, skills là yếu tố quyết định nhất. Client thuê freelancer vì họ có skills cần thiết, không phải vì bio hay description hay."

## Skill Overlap Ratio

```
skill_overlap_ratio = số skills match / tổng số skills yêu cầu
```

**Ví dụ:**
- Job yêu cầu: React, TypeScript, CSS, GraphQL (4 skills)
- Freelancer có: React, TypeScript, CSS, HTML (4 skills)
- Match: React, TypeScript, CSS (3 skills)
- **Ratio = 3/4 = 0.75 (75%)**

---

# PHẦN 4: CHECKLIST TRƯỚC KHI DEMO

- [ ] Chạy `npm run seed -- ml-diverse` thành công
- [ ] Backend API đang chạy (`npm run dev`)
- [ ] Frontend đang chạy
- [ ] ML service đang chạy (nếu có)
- [ ] Test login với `ml.diverse.client1@client.test`
- [ ] Test login với `ml.diverse.freelancer1@freelancer.test`
- [ ] Kiểm tra có jobs trong "My Jobs" của client
- [ ] Kiểm tra có jobs trong "Find Jobs" của freelancer

---

# PHẦN 5: CÂU HỎI HỘI ĐỒNG CÓ THỂ HỎI

### Q: "Tại sao không dùng Collaborative Filtering?"
> **A:** Collaborative Filtering cần historical data (ai đã thuê ai). Với user mới hoặc job mới, không có data → Cold Start Problem. Content-Based giải quyết được vì chỉ cần content (skills, description).

### Q: "Model có thể gợi ý sai không?"
> **A:** Có thể. Nếu freelancer có skills nhưng không có experience thực tế, model vẫn gợi ý. Đây là limitation của Content-Based. Giải pháp: kết hợp với reviews/ratings trong tương lai.

### Q: "Làm sao xử lý skills mới không có trong database?"
> **A:** Sentence Transformer embed text thành vector 384 chiều. Skills mới sẽ có embedding gần với skills tương tự. Ví dụ: "Svelte" sẽ gần với "React", "Vue" vì đều là frontend frameworks.

### Q: "Tại sao chọn Logistic Regression cho p_match?"
> **A:** Logistic Regression đơn giản, interpretable, và đủ tốt cho bài toán này. Với ~1000 samples, model phức tạp hơn (Neural Network) dễ overfit. Logistic Regression cũng cho phép phân tích feature importance.
