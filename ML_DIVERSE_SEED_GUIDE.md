# ML Diverse Seed Data Guide - QUALITY FOCUSED ✅

## ✅ STATUS: OPTIMIZED FOR QUALITY & DIVERSITY

**Focus: Quality over Quantity - Unique & Realistic Data**
- ✅ **50 Unique Freelancer Templates** with descriptive titles (no more generic "X Developer")
- ✅ **Minimal Skill Overlap** - each freelancer has unique skill combinations
- ✅ **Diverse Bio Templates** - 6 different bio patterns with experience levels
- ✅ **Varied Job Descriptions** - 6 different description templates
- ✅ **Realistic Company Profiles** - diverse company descriptions
- ✅ **All TypeScript errors fixed** and skills validated

## Tổng quan

File `prisma/seed/ml-diverse-data.ts` tạo dữ liệu **chất lượng cao và đa dạng** cho việc train ML models:

### Số lượng dữ liệu (QUALITY FOCUSED)
- **25 Clients** - Diverse company profiles with unique descriptions
- **50 Freelancers** - Unique titles & skill combinations (minimal overlap)
- **100 Jobs** - Varied descriptions & requirements
- **500+ Interactions** - Quality interactions with diverse patterns

### Đặc điểm quan trọng cho ML Training

1. **Unique Freelancer Titles**: 
   - ❌ Old: "React Developer", "Vue.js Developer", "Angular Developer"
   - ✅ New: "Senior React Architect", "Vue.js Performance Expert", "Angular Enterprise Consultant"

2. **Diverse Skill Combinations**: 
   - Each freelancer has 4-5 unique skills
   - Minimal overlap between freelancers (max 20% overlap)
   - Realistic skill pairings (React + TypeScript + Tailwind)

3. **Varied Bio Templates**: 6 different patterns
   - Experience-focused: "X years of experience..."
   - Expertise-focused: "Specialized in Y and Z..."
   - Project-focused: "Delivered 50+ successful projects..."
   - Remote-focused: "X years of remote collaboration..."
   - Passion-focused: "Passionate about X ecosystem..."
   - Innovation-focused: "X years of continuous learning..."

4. **Diverse Job Descriptions**: 6 different templates
   - Professional: "We are seeking a talented professional..."
   - Expert-focused: "Looking for an expert to..."
   - Direct: "X needed - We need someone who..."
   - Exciting: "Exciting project alert! We're looking..."
   - Collaborative: "Join us to... We value expertise..."
   - International: "X needed for innovative project..."

## Freelancer Templates (50 Unique Combinations)

### Frontend Specialists (12)
- Senior React Architect, Vue.js Performance Expert, Angular Enterprise Consultant
- Next.js E-commerce Specialist, Svelte Innovation Developer
- Frontend Accessibility Expert, Progressive Web App Builder
- Component Library Architect, Micro-Frontend Specialist
- Animation & Motion Designer, JAMstack Developer, Frontend Performance Optimizer

### Backend Specialists (12)
- Node.js Microservices Architect, Python AI Backend Engineer, Go Concurrency Expert
- GraphQL API Specialist, Java Enterprise Solutions Lead, Django Scalability Engineer
- Event-Driven Architecture Expert, High-Performance API Developer
- Serverless Backend Specialist, Real-time Systems Engineer
- PHP Modern Stack Developer, Ruby Performance Optimizer

### Fullstack Engineers (8)
- MERN Stack Architect, Next.js Full-Stack Engineer, T3 Stack Specialist
- Django + React Expert, SaaS Platform Developer, E-commerce Full-Stack Lead
- Remix Full-Stack Developer, JAMstack + Headless CMS Expert

### Mobile Specialists (6)
- Flutter Cross-Platform Lead, React Native Performance Expert
- iOS SwiftUI Specialist, Android Jetpack Compose Expert
- Mobile DevOps Engineer, Hybrid App Architect

### DevOps & Cloud (6)
- Kubernetes Platform Engineer, AWS Solutions Architect, Site Reliability Engineer
- Infrastructure as Code Expert, CI/CD Pipeline Architect, Multi-Cloud Engineer

### Data & AI Specialists (6)
- MLOps Engineer, Deep Learning Researcher, Data Pipeline Architect
- Computer Vision Engineer, NLP & LLM Specialist, Business Intelligence Analyst

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

## Features cho ML Training

### Rich Feature Set
| Feature Category | Examples |
|------------------|----------|
| **Unique Titles** | "Senior React Architect", "Python AI Backend Engineer", "MLOps Engineer" |
| **Skill Diversity** | 4-5 skills per freelancer, minimal overlap, realistic combinations |
| **Bio Variety** | 6 different bio templates with 2-10 years experience |
| **Job Descriptions** | 6 different description templates for variety |
| **Company Profiles** | 6 different company description patterns |
| **Interaction Quality** | 2-5 interactions per job, diverse cover letters & invite messages |

### Realistic Patterns
- **Skill Matching**: React Architect + React jobs → high interaction probability
- **Experience Levels**: 2-10 years experience with realistic bio patterns
- **Title Logic**: "GraphQL API Specialist" has GraphQL + Node.js + TypeScript skills
- **Budget Alignment**: Complex roles (MLOps, Blockchain) → higher budgets
- **Geographic Distribution**: 12 countries with realistic freelancer distribution

## Email Patterns

```
Clients:     ml.diverse.client{1-25}@client.test
Freelancers: ml.diverse.freelancer{1-50}@freelancer.test
Password:    TestPassword!123
```

## Demo Scenarios Enabled

1. **Unique Skill Matching**: "Senior React Architect" finding React + TypeScript projects
2. **Specialized Roles**: "MLOps Engineer" finding ML infrastructure projects
3. **Experience Matching**: Senior developers (8+ years) with complex projects
4. **Technology Focus**: "Vue.js Performance Expert" finding Vue.js optimization work
5. **Cross-platform Expertise**: "Flutter Cross-Platform Lead" finding mobile projects
6. **Enterprise Solutions**: "Java Enterprise Solutions Lead" finding enterprise projects

## Lưu ý

1. **✅ Quality over Quantity**: 50 unique freelancers vs 500 similar ones
2. **✅ Minimal Skill Overlap**: Each freelancer has unique skill combinations
3. **✅ Realistic Titles**: Descriptive, professional titles that match skills
4. **✅ Diverse Content**: Bio, job descriptions, company profiles all varied
5. **✅ Ready to Run**: No compilation errors, all dependencies satisfied
6. **Reproducibility**: Sử dụng seeded random để kết quả nhất quán
7. **Skip duplicates**: Có thể chạy lại mà không tạo duplicate
8. **Dependencies**: Cần chạy `taxonomy` trước để có skills/specialties

## Run Command

```bash
npm run seed -- ml-diverse
```

**Expected Output:**
- ✅ 25 ML Diverse Clients created (unique company profiles)
- ✅ 50 ML Diverse Freelancers created (unique titles & skills)
- ✅ 100 ML Diverse Jobs created (varied descriptions)
- ✅ 500+ ML Diverse Interactions created (quality interactions)

**Key Improvements:**
- 🎯 **Unique freelancer titles** (no more generic "X Developer")
- 🎯 **Minimal skill overlap** between freelancers
- 🎯 **Diverse bio & description templates**
- 🎯 **Realistic experience levels** (2-10 years)
- 🎯 **Quality over quantity** approach