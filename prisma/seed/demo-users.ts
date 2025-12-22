/**
 * Demo Users Seeding - Premium quality accounts for demo/presentation
 * - dudodev1111@gmail.com: Freelancer with complete profile
 * - duwebclient1@gmail.com: Client with pre-created jobs
 * - dudo121234@gmail.com: Admin account
 */

import {
  JobDurationCommitment, JobExperienceLevel, JobLocationType, JobPaymentMode,
  JobStatus, JobVisibility, Role, CompanySize, LanguageProficiency
} from '../../src/generated/prisma'
import bcrypt from 'bcrypt'
import { prisma, runStep } from './_utils'

const DEMO_PASSWORD_HASH = bcrypt.hashSync('TestPassword!123', 10)
const VERIFIED_AT = new Date('2024-01-01T00:00:00.000Z')

async function seedDemoFreelancer() {
  const email = 'dudodev1111@gmail.com'
  
  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`↷ Demo Freelancer ${email} already exists, skipping...`)
    return existing.id
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: DEMO_PASSWORD_HASH,
      role: Role.FREELANCER,
      emailVerifiedAt: VERIFIED_AT,
      isActive: true,
      profile: {
        create: {
          firstName: 'Đức',
          lastName: 'Đỗ',
          country: 'Vietnam',
          city: 'Ho Chi Minh City',
          phoneNumber: '+84-909-123-456',
          freelancer: {
            create: {
              title: 'Senior Full-Stack Developer & AI Integration Specialist',
              bio: `Experienced Full-Stack Developer with 5+ years building scalable web applications and AI-powered solutions. 

🚀 Expertise:
• Frontend: React, Next.js, TypeScript, Tailwind CSS
• Backend: Node.js, NestJS, Python, FastAPI
• Database: PostgreSQL, MongoDB, Redis
• AI/ML: LangChain, OpenAI API, RAG systems
• DevOps: Docker, AWS, CI/CD

💼 Notable Projects:
• Built AI-powered freelance matching platform serving 10K+ users
• Developed real-time collaboration tools for remote teams
• Created automated ML pipelines for recommendation systems

🎯 I specialize in:
• Full-stack web application development
• AI/LLM integration and chatbot development
• System architecture and performance optimization
• Technical leadership and code review

Available for long-term projects and consulting. Let's build something amazing together!`
            }
          }
        }
      }
    }
  })

  // Add skills - diverse and high-quality
  const skills = [
    'skill_react', 'skill_nextjs', 'skill_typescript', 'skill_nodejs', 'skill_nestjs',
    'skill_python', 'skill_fastapi', 'skill_postgresql', 'skill_mongodb', 'skill_redis',
    'skill_docker', 'skill_aws', 'skill_graphql', 'skill_tailwind', 'skill_git'
  ]
  
  const existingSkills = await prisma.skill.findMany({
    where: { id: { in: skills } },
    select: { id: true }
  })
  
  if (existingSkills.length > 0) {
    await prisma.freelancerSkillSelection.createMany({
      data: existingSkills.map((skill, index) => ({
        userId: user.id,
        skillId: skill.id,
        orderHint: index
      })),
      skipDuplicates: true
    })
  }

  // Add categories
  await prisma.freelancerCategorySelection.create({
    data: { userId: user.id, categoryId: 'category_web_dev' }
  }).catch(() => {})

  await prisma.freelancerCategorySelection.create({
    data: { userId: user.id, categoryId: 'category_ai_ml' }
  }).catch(() => {})

  // Add specialties
  const specialties = ['specialty_fullstack_dev', 'specialty_backend_dev', 'specialty_llm_apps']
  for (const specialtyId of specialties) {
    await prisma.freelancerSpecialtySelection.create({
      data: { userId: user.id, specialtyId }
    }).catch(() => {})
  }

  // Add languages
  await prisma.freelancerLanguage.createMany({
    data: [
      { freelancerId: user.id, languageCode: 'vi', proficiency: LanguageProficiency.NATIVE },
      { freelancerId: user.id, languageCode: 'en', proficiency: LanguageProficiency.FLUENT }
    ],
    skipDuplicates: true
  })

  // Add education
  await prisma.education.create({
    data: {
      freelancerId: user.id,
      schoolName: 'Ho Chi Minh City University of Technology (HCMUT)',
      degreeTitle: 'Bachelor of Engineering',
      fieldOfStudy: 'Computer Science',
      startYear: 2016,
      endYear: 2020
    }
  }).catch(() => {})

  console.log(`✅ Created Demo Freelancer: ${email}`)
  return user.id
}

async function seedDemoClient() {
  const email = 'duwebclient1@gmail.com'
  
  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`↷ Demo Client ${email} already exists, skipping...`)
    return existing.id
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: DEMO_PASSWORD_HASH,
      role: Role.CLIENT,
      emailVerifiedAt: VERIFIED_AT,
      isActive: true,
      profile: {
        create: {
          firstName: 'Minh',
          lastName: 'Trần',
          country: 'Vietnam',
          city: 'Ho Chi Minh City',
          phoneNumber: '+84-908-765-432',
          client: {
            create: {
              companyName: 'TechViet Solutions',
              size: CompanySize.TEN_TO_NINETY,
              description: 'Leading tech company in Vietnam specializing in digital transformation, AI solutions, and custom software development. 50+ professionals serving clients across Southeast Asia.'
            }
          }
        }
      }
    }
  })

  console.log(`✅ Created Demo Client: ${email}`)
  return user.id
}


async function seedDemoClientJobs(clientId: string) {
  // Job 1: AI Chatbot Development
  const job1Id = 'demo_job_ai_chatbot'
  await prisma.jobPost.upsert({
    where: { id: job1Id },
    update: {},
    create: {
      id: job1Id,
      clientId,
      title: 'Build AI-Powered Customer Support Chatbot with RAG',
      description: `We're looking for an experienced AI developer to build an intelligent customer support chatbot for our e-commerce platform.

📋 Project Overview:
Build a conversational AI chatbot that can answer customer queries using our product database and support documentation. The chatbot should use RAG (Retrieval Augmented Generation) to provide accurate, context-aware responses.

🎯 Requirements:
• Integrate with OpenAI GPT-4 or similar LLM
• Implement RAG system with vector database (Pinecone/Weaviate)
• Build admin dashboard for managing knowledge base
• Support Vietnamese and English languages
• Real-time chat interface with typing indicators
• Analytics dashboard for conversation insights

💻 Tech Stack:
• Frontend: React/Next.js with TypeScript
• Backend: Node.js/Python with FastAPI
• Database: PostgreSQL + Vector DB
• AI: LangChain, OpenAI API

📅 Timeline: 2-3 months
💰 Budget: $15,000 - $25,000

Looking for someone who has built similar AI chatbot systems before. Please share relevant portfolio examples.`,
      specialtyId: 'specialty_llm_apps',
      experienceLevel: JobExperienceLevel.EXPERT,
      locationType: JobLocationType.REMOTE,
      paymentMode: JobPaymentMode.FIXED_SINGLE,
      budgetAmount: 20000,
      budgetCurrency: 'USD',
      duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
      status: JobStatus.PUBLISHED,
      visibility: JobVisibility.PUBLIC,
      publishedAt: new Date('2024-12-01')
    }
  })

  // Add skills to job 1
  const job1Skills = ['skill_react', 'skill_nextjs', 'skill_python', 'skill_fastapi', 'skill_postgresql']
  const existingSkills1 = await prisma.skill.findMany({
    where: { id: { in: job1Skills } },
    select: { id: true }
  })
  await prisma.jobRequiredSkill.deleteMany({ where: { jobId: job1Id } })
  await prisma.jobRequiredSkill.createMany({
    data: existingSkills1.map((skill, index) => ({ jobId: job1Id, skillId: skill.id, orderHint: index }))
  })

  // Add screening questions to job 1
  await prisma.jobScreeningQuestion.deleteMany({ where: { jobId: job1Id } })
  await prisma.jobScreeningQuestion.createMany({
    data: [
      { jobId: job1Id, question: 'Have you built AI chatbots with RAG before? Please share examples.', isRequired: true },
      { jobId: job1Id, question: 'What vector database would you recommend for this project and why?', isRequired: true },
      { jobId: job1Id, question: 'How would you handle multilingual support (Vietnamese/English)?', isRequired: false }
    ]
  })

  // Add language requirement
  await prisma.jobLanguageRequirement.deleteMany({ where: { jobId: job1Id } })
  await prisma.jobLanguageRequirement.create({
    data: { jobId: job1Id, languageCode: 'en', proficiency: LanguageProficiency.FLUENT }
  })

  // Job 2: Full-Stack Web Application
  const job2Id = 'demo_job_fullstack_app'
  await prisma.jobPost.upsert({
    where: { id: job2Id },
    update: {},
    create: {
      id: job2Id,
      clientId,
      title: 'Develop Modern SaaS Dashboard with Real-time Analytics',
      description: `We need a skilled full-stack developer to build a comprehensive SaaS dashboard for our business analytics platform.

📋 Project Overview:
Create a modern, responsive dashboard that displays real-time business metrics, generates reports, and provides actionable insights for our enterprise clients.

🎯 Key Features:
• Real-time data visualization with interactive charts
• User management with role-based access control
• Customizable dashboard widgets
• Automated report generation (PDF/Excel)
• Integration with external data sources via APIs
• Mobile-responsive design

💻 Tech Stack:
• Frontend: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
• Backend: NestJS with GraphQL
• Database: PostgreSQL with Prisma ORM
• Real-time: WebSocket/Server-Sent Events
• Charts: Recharts or Chart.js

📅 Timeline: 3-4 months
💰 Budget: $18,000 - $30,000

We value clean code, good documentation, and test coverage. Experience with similar SaaS products is a plus.`,
      specialtyId: 'specialty_fullstack_dev',
      experienceLevel: JobExperienceLevel.INTERMEDIATE,
      locationType: JobLocationType.REMOTE,
      paymentMode: JobPaymentMode.FIXED_SINGLE,
      budgetAmount: 25000,
      budgetCurrency: 'USD',
      duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
      status: JobStatus.PUBLISHED,
      visibility: JobVisibility.PUBLIC,
      publishedAt: new Date('2024-12-10')
    }
  })

  // Add skills to job 2
  const job2Skills = ['skill_nextjs', 'skill_typescript', 'skill_nestjs', 'skill_graphql', 'skill_postgresql', 'skill_tailwind']
  const existingSkills2 = await prisma.skill.findMany({
    where: { id: { in: job2Skills } },
    select: { id: true }
  })
  await prisma.jobRequiredSkill.deleteMany({ where: { jobId: job2Id } })
  await prisma.jobRequiredSkill.createMany({
    data: existingSkills2.map((skill, index) => ({ jobId: job2Id, skillId: skill.id, orderHint: index }))
  })

  // Add screening questions to job 2
  await prisma.jobScreeningQuestion.deleteMany({ where: { jobId: job2Id } })
  await prisma.jobScreeningQuestion.createMany({
    data: [
      { jobId: job2Id, question: 'Please share your experience building SaaS dashboards or similar products.', isRequired: true },
      { jobId: job2Id, question: 'How do you approach real-time data updates in web applications?', isRequired: true },
      { jobId: job2Id, question: 'What is your testing strategy for full-stack applications?', isRequired: false }
    ]
  })

  await prisma.jobLanguageRequirement.deleteMany({ where: { jobId: job2Id } })
  await prisma.jobLanguageRequirement.create({
    data: { jobId: job2Id, languageCode: 'en', proficiency: LanguageProficiency.FLUENT }
  })

  // Job 3: Mobile App Development
  const job3Id = 'demo_job_mobile_app'
  await prisma.jobPost.upsert({
    where: { id: job3Id },
    update: {},
    create: {
      id: job3Id,
      clientId,
      title: 'Build Cross-Platform Mobile App for Food Delivery Service',
      description: `Looking for a React Native or Flutter developer to create a food delivery mobile application.

📋 Project Overview:
Develop a complete food delivery app with customer, restaurant, and driver interfaces. The app should provide a seamless ordering experience with real-time tracking.

🎯 Key Features:
• Customer app: Browse restaurants, order food, track delivery
• Restaurant dashboard: Manage menu, accept orders
• Driver app: Accept deliveries, navigation, earnings
• Real-time order tracking with maps
• Push notifications
• Payment integration (Stripe/local payment methods)
• Rating and review system

💻 Tech Stack:
• Mobile: React Native or Flutter
• Backend: Node.js/NestJS (existing API)
• Maps: Google Maps/Mapbox
• Real-time: Socket.IO

📅 Timeline: 4-5 months
💰 Budget: $20,000 - $35,000

Experience with food delivery or similar logistics apps is highly preferred.`,
      specialtyId: 'specialty_cross_platform_mobile',
      experienceLevel: JobExperienceLevel.EXPERT,
      locationType: JobLocationType.REMOTE,
      paymentMode: JobPaymentMode.FIXED_SINGLE,
      budgetAmount: 28000,
      budgetCurrency: 'USD',
      duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
      status: JobStatus.PUBLISHED,
      visibility: JobVisibility.PUBLIC,
      publishedAt: new Date('2024-12-15')
    }
  })

  // Add skills to job 3
  const job3Skills = ['skill_react_native', 'skill_typescript', 'skill_nodejs', 'skill_firebase', 'skill_rest_api']
  const existingSkills3 = await prisma.skill.findMany({
    where: { id: { in: job3Skills } },
    select: { id: true }
  })
  await prisma.jobRequiredSkill.deleteMany({ where: { jobId: job3Id } })
  await prisma.jobRequiredSkill.createMany({
    data: existingSkills3.map((skill, index) => ({ jobId: job3Id, skillId: skill.id, orderHint: index }))
  })

  await prisma.jobScreeningQuestion.deleteMany({ where: { jobId: job3Id } })
  await prisma.jobScreeningQuestion.createMany({
    data: [
      { jobId: job3Id, question: 'Have you built delivery or logistics apps before? Please share examples.', isRequired: true },
      { jobId: job3Id, question: 'How would you implement real-time location tracking?', isRequired: true }
    ]
  })

  await prisma.jobLanguageRequirement.deleteMany({ where: { jobId: job3Id } })
  await prisma.jobLanguageRequirement.create({
    data: { jobId: job3Id, languageCode: 'en', proficiency: LanguageProficiency.FLUENT }
  })

  console.log(`✅ Created 3 demo jobs for client`)
}

async function seedDemoAdmin() {
  const email = 'dudo121234@gmail.com'
  
  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`↷ Demo Admin ${email} already exists, skipping...`)
    return existing.id
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: DEMO_PASSWORD_HASH,
      role: Role.ADMIN,
      emailVerifiedAt: VERIFIED_AT,
      isActive: true,
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'System',
          country: 'Vietnam',
          city: 'Ho Chi Minh City'
        }
      }
    }
  })

  console.log(`✅ Created Demo Admin: ${email}`)
  return user.id
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export async function seedDemoUsers(): Promise<void> {
  console.log('\n👤 Seeding Demo Users (Premium Quality)...\n')

  await runStep('Creating Demo Freelancer', seedDemoFreelancer)
  const clientId = await runStep('Creating Demo Client', seedDemoClient)
  if (clientId) {
    await runStep('Creating Demo Client Jobs', () => seedDemoClientJobs(clientId))
  }
  await runStep('Creating Demo Admin', seedDemoAdmin)

  console.log('\n✅ Demo Users seeding completed!')
  console.log('\n📧 Demo Accounts:')
  console.log('   Freelancer: dudodev1111@gmail.com')
  console.log('   Client: duwebclient1@gmail.com (with 3 pre-created jobs)')
  console.log('   Admin: dudo121234@gmail.com')
  console.log('   Password: TestPassword!123')
}
