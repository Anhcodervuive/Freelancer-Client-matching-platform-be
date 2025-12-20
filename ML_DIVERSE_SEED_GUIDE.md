# ML Diverse Seed Data Guide - FIXED & READY ✅

## ✅ STATUS: ALL ERRORS FIXED - READY TO RUN

**All TypeScript compilation errors have been resolved:**
- ✅ Fixed foreign key constraint issues with specialty IDs
- ✅ Fixed budget array access with proper null handling  
- ✅ Updated all specialty references to match taxonomy
- ✅ Validated all skill, category, and specialty IDs exist
- ✅ No more TypeScript compilation errors

## Tổng quan

File `prisma/seed/ml-diverse-data.ts` tạo dữ liệu đa dạng cho việc train ML models với quy mô lớn:

### Số lượng dữ liệu (EXPANDED)
- **200 Clients** - Khách hàng từ nhiều quốc gia, company sizes khác nhau
- **500 Freelancers** - Freelancers với skills đa dạng, 60+ templates
- **800 Jobs** - Jobs với 100+ templates thực tế, skill requirements đa dạng
- **2000+ Interactions** - Views, proposals, invitations với patterns có ý nghĩa

### Đặc điểm quan trọng cho ML Training

1. **Skill Diversity**: Mỗi job/freelancer có 4-7 skills (tăng từ 3-7)
2. **Template Diversity**: 100+ job templates, 60+ freelancer templates
3. **Category Coverage**: 13 categories, 50+ specialties, 150+ skills
4. **Realistic Patterns**: 
   - Logical skill combinations (React + TypeScript + Tailwind)
   - Proper title-skill matching (React Developer có React skills)
   - Budget ranges phù hợp với complexity ($2K-$80K)

## Cách sử dụng

### Chạy seed ML diverse data

```bash
cd lvtn_be

# Chạy chỉ ML diverse data (RECOMMENDED)
npm run seed -- ml-diverse

# Hoặc chạy tất cả seeds (bao gồm ML diverse)
npm run seed
```

### Thứ tự chạy (nếu chạy từng phần)

```bash
# 1. Taxonomy (categories, specialties, skills) - BẮT BUỘC chạy trước
npm run seed -- taxonomy

# 2. ML Diverse Data - CHO ML TRAINING
npm run seed -- ml-diverse
```

## Cấu trúc dữ liệu (EXPANDED)

### Job Templates (100+ templates)
- **Frontend Development (10)**: React dashboards, Vue.js CRMs, Angular enterprise, Next.js e-commerce
- **Backend Development (10)**: Node.js APIs, Python FastAPI, Go microservices, NestJS architecture
- **Fullstack Development (8)**: SaaS applications, booking platforms, social media platforms
- **Mobile Development (8)**: Flutter e-commerce, React Native social, native iOS/Android apps
- **Cloud & DevOps (6)**: Kubernetes deployments, AWS infrastructure, CI/CD pipelines
- **Data Science & AI (6)**: PyTorch models, ETL pipelines, Power BI dashboards
- **Blockchain & Web3 (8)**: Solidity contracts, DeFi protocols, NFT marketplaces
- **E-commerce & CMS (6)**: Shopify themes, WooCommerce plugins, headless commerce
- **Cybersecurity (6)**: Penetration testing, security monitoring, compliance frameworks
- **Game Development (6)**: Unity games, Unreal Engine, VR experiences
- **Quality Assurance (6)**: Playwright testing, Cypress automation, API testing
- **Product Design (4)**: UI/UX design, design systems, UX research
- **IoT & Embedded (4)**: Device management, embedded firmware, smart home
- **Technical Writing (4)**: API documentation, developer guides

### Freelancer Templates (60+ templates)
Tương ứng với các specialty, với titles logic:
- "React Developer" → có React, TypeScript, CSS skills
- "Python Backend Developer" → có Python, FastAPI, PostgreSQL skills
- "Flutter Mobile Developer" → có Flutter, REST API, Firebase skills

### Locations (12 countries)
- San Francisco, New York (USA)
- London (UK), Berlin (Germany)
- Singapore, Tokyo (Asia)
- Ho Chi Minh City (Vietnam)
- Sydney (Australia), Toronto (Canada)
- Dubai (UAE), Seoul (South Korea), Mumbai (India)

## Features cho ML Training

### Rich Feature Set
| Feature Category | Examples |
|------------------|----------|
| **Job Features** | Title, description, 4-7 skills, budget ($2K-$80K), location type, experience level |
| **Freelancer Features** | Title, bio, 4-7 skills, specialties, location, experience |
| **Interaction Features** | Type (view/proposal/invitation), source, match scores (0.5-0.95) |
| **Screening Features** | 20 diverse screening questions, language requirements |
| **Contextual Features** | Company size, project duration, geographic distribution |

### Realistic Patterns
- **High Skill Match**: React developer + React job → high interaction probability
- **Budget Alignment**: Complex projects (blockchain, AI) → higher budgets
- **Experience Matching**: Entry-level freelancers → entry-level projects
- **Geographic Considerations**: Timezone-friendly matching patterns

## Job Categories & Skills Coverage

### Programming Languages (20+)
JavaScript, TypeScript, Python, Go, Java, Rust, Solidity, Swift, Kotlin, C#, C++, PHP, Ruby

### Frontend Frameworks (15+)
React, Vue.js, Angular, Next.js, Svelte, Nuxt.js, Remix, Astro

### Backend Frameworks (15+)
Express.js, NestJS, Django, FastAPI, Spring Boot, Laravel, Ruby on Rails

### Databases (10+)
PostgreSQL, MongoDB, Redis, MySQL, Elasticsearch, DynamoDB, Cassandra

### Cloud & DevOps (20+)
AWS, Azure, GCP, Docker, Kubernetes, Terraform, CI/CD, Ansible, Jenkins, Prometheus

### Design & Creative (10+)
Figma, Adobe XD, Sketch, Photoshop, After Effects, Illustrator

### Testing Tools (10+)
Cypress, Playwright, Jest, Selenium, Postman, Performance Testing

### Blockchain & Web3 (8+)
Solidity, Web3.js, Ethers.js, Hardhat, Smart Contracts

### Mobile Development (10+)
Flutter, React Native, Swift, Kotlin, SwiftUI, Jetpack Compose, Expo

### AI & Machine Learning (15+)
TensorFlow, PyTorch, scikit-learn, Pandas, NumPy, Hugging Face, LangChain

## Interaction Patterns

### Realistic Match Scoring
- **0.9-0.95**: Perfect skill match + experience alignment
- **0.7-0.89**: Good skill overlap + compatible experience
- **0.5-0.69**: Some skill overlap + mixed compatibility
- **Below 0.5**: Poor match (filtered out)

### Proposal & Invitation Patterns
- **High Match Jobs**: 60-90% proposal acceptance rate
- **Medium Match Jobs**: 30-58% acceptance rate  
- **Screening Questions**: Relevant to job requirements
- **Geographic Factors**: Remote-friendly vs location-specific

## Email Patterns

```
Clients:     ml.diverse.client{1-200}@client.test
Freelancers: ml.diverse.freelancer{1-500}@freelancer.test
Password:    TestPassword!123
```

## Demo Scenarios Enabled

1. **Skill-based Matching**: React developer finding React + TypeScript projects
2. **Budget Filtering**: Projects within freelancer's rate range
3. **Experience Matching**: Junior developers with entry-level projects
4. **Location Preferences**: Remote vs on-site vs hybrid filtering
5. **Specialty Focus**: Blockchain experts finding DeFi and smart contract work
6. **Multi-skill Projects**: Fullstack roles requiring diverse skill combinations
7. **Screening Process**: Jobs with relevant screening questions
8. **Language Requirements**: English proficiency matching

## Technical Implementation

### ✅ Fixed Issues
- **Foreign Key Constraints**: All specialty IDs validated against taxonomy
- **TypeScript Errors**: Proper null handling for budget arrays
- **Skill References**: All skill IDs exist in taxonomy  
- **Category Mapping**: Correct category-specialty relationships

### Performance Features
- **Seeded Random**: Deterministic results for reproducible datasets
- **Batch Operations**: Efficient creation of large datasets
- **Upsert Patterns**: Safe re-running without duplicates
- **Validation**: All foreign key references checked before creation

## Lưu ý

1. **✅ Ready to Run**: No more compilation errors, all dependencies satisfied
2. **Reproducibility**: Sử dụng seeded random để kết quả nhất quán
3. **Skip duplicates**: Có thể chạy lại mà không tạo duplicate
4. **Dependencies**: Cần chạy `taxonomy` trước để có skills/specialties
5. **Scale**: Tạo 200 clients, 500 freelancers, 800 jobs, 2000+ interactions

## Run Command

```bash
npm run seed -- ml-diverse
```

**Expected Output:**
- ✅ 200 ML Diverse Clients created
- ✅ 500 ML Diverse Freelancers created  
- ✅ 800 ML Diverse Jobs created
- ✅ 2000+ ML Diverse Interactions created