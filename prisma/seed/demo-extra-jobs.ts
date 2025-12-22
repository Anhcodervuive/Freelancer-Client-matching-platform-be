/**
 * Demo Extra Jobs - Thêm 5 công việc mới cho client duwebclient1@gmail.com
 * Chạy: npx prisma db seed -- demo-extra-jobs
 */

import {
  JobDurationCommitment, JobExperienceLevel, JobLocationType, JobPaymentMode,
  JobStatus, JobVisibility, LanguageProficiency
} from '../../src/generated/prisma'
import { prisma, runStep } from './_utils'

const CLIENT_EMAIL = 'duwebclient1@gmail.com'

async function getClientId(): Promise<string | null> {
  const client = await prisma.user.findUnique({
    where: { email: CLIENT_EMAIL },
    select: { id: true }
  })
  return client?.id ?? null
}

async function seedExtraJobs(clientId: string) {
  console.log(`\n📝 Creating 5 extra jobs for ${CLIENT_EMAIL}...\n`)

  // Job 4: E-commerce Platform
  const job4Id = 'demo_job_ecommerce_platform'
  await prisma.jobPost.upsert({
    where: { id: job4Id },
    update: {},
    create: {
      id: job4Id,
      clientId,
      title: 'Build Modern E-commerce Platform with Headless CMS',
      description: `We're building a next-generation e-commerce platform for our retail business expansion.

📋 Project Overview:
Create a scalable, high-performance e-commerce platform with headless architecture. The platform will serve multiple storefronts and support B2B/B2C operations.

🎯 Key Features:
• Product catalog with advanced filtering and search (Algolia/Elasticsearch)
• Shopping cart with persistent sessions
• Multi-payment gateway integration (Stripe, PayPal, VNPay)
• Inventory management system
• Order processing and fulfillment workflow
• Customer account management with wishlists
• SEO-optimized product pages
• Admin dashboard for store management

💻 Tech Stack:
• Frontend: Next.js 14 with App Router, TypeScript
• Headless CMS: Strapi or Sanity
• Backend: Node.js with Express/NestJS
• Database: PostgreSQL + Redis for caching
• Search: Algolia or Elasticsearch
• Payments: Stripe Connect

📅 Timeline: 3-4 months
💰 Budget: $22,000 - $35,000

Looking for developers with proven e-commerce experience. Must understand payment security and PCI compliance basics.`,
      specialtyId: 'specialty_fullstack_dev',
      experienceLevel: JobExperienceLevel.EXPERT,
      locationType: JobLocationType.REMOTE,
      paymentMode: JobPaymentMode.FIXED_SINGLE,
      budgetAmount: 28000,
      budgetCurrency: 'USD',
      duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
      status: JobStatus.PUBLISHED,
      visibility: JobVisibility.PUBLIC,
      publishedAt: new Date('2024-12-18')
    }
  })

  const job4Skills = ['skill_nextjs', 'skill_typescript', 'skill_nodejs', 'skill_postgresql', 'skill_redis']
  const existingSkills4 = await prisma.skill.findMany({
    where: { id: { in: job4Skills } },
    select: { id: true }
  })
  await prisma.jobRequiredSkill.deleteMany({ where: { jobId: job4Id } })
  if (existingSkills4.length > 0) {
    await prisma.jobRequiredSkill.createMany({
      data: existingSkills4.map((skill, index) => ({ jobId: job4Id, skillId: skill.id, orderHint: index }))
    })
  }

  await prisma.jobScreeningQuestion.deleteMany({ where: { jobId: job4Id } })
  await prisma.jobScreeningQuestion.createMany({
    data: [
      { jobId: job4Id, question: 'Share your experience building e-commerce platforms. What was the scale?', isRequired: true },
      { jobId: job4Id, question: 'How would you handle high-traffic sales events (flash sales)?', isRequired: true },
      { jobId: job4Id, question: 'What payment gateways have you integrated before?', isRequired: false }
    ]
  })

  await prisma.jobLanguageRequirement.deleteMany({ where: { jobId: job4Id } })
  await prisma.jobLanguageRequirement.create({
    data: { jobId: job4Id, languageCode: 'en', proficiency: LanguageProficiency.FLUENT }
  })

  console.log('  ✅ Job 4: E-commerce Platform')

  // Job 5: HR Management System
  const job5Id = 'demo_job_hr_system'
  await prisma.jobPost.upsert({
    where: { id: job5Id },
    update: {},
    create: {
      id: job5Id,
      clientId,
      title: 'Develop HR Management System with Payroll Integration',
      description: `We need a comprehensive HR management system for our growing company (200+ employees).

📋 Project Overview:
Build an internal HR platform to manage employee lifecycle, attendance, leave management, and payroll processing.

🎯 Core Modules:
• Employee Management: Profiles, documents, org chart
• Attendance & Time Tracking: Check-in/out, overtime calculation
• Leave Management: Request, approval workflow, balance tracking
• Payroll Processing: Salary calculation, tax deductions, payslips
• Performance Reviews: Goal setting, 360 feedback, appraisals
• Recruitment: Job postings, applicant tracking, interview scheduling
• Reports & Analytics: HR metrics, turnover analysis, headcount

💻 Technical Requirements:
• Web application with responsive design
• Role-based access control (Admin, HR, Manager, Employee)
• Integration with existing accounting software
• Export capabilities (Excel, PDF)
• Audit trail for compliance

💻 Preferred Tech Stack:
• Frontend: React/Vue.js with TypeScript
• Backend: Node.js or Python Django
• Database: PostgreSQL
• Authentication: SSO/LDAP integration

📅 Timeline: 4-5 months
💰 Budget: $25,000 - $40,000

Experience with HR/ERP systems is required. Understanding of Vietnam labor law is a plus.`,
      specialtyId: 'specialty_fullstack_dev',
      experienceLevel: JobExperienceLevel.INTERMEDIATE,
      locationType: JobLocationType.REMOTE,
      paymentMode: JobPaymentMode.FIXED_SINGLE,
      budgetAmount: 32000,
      budgetCurrency: 'USD',
      duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
      status: JobStatus.PUBLISHED,
      visibility: JobVisibility.PUBLIC,
      publishedAt: new Date('2024-12-19')
    }
  })

  const job5Skills = ['skill_react', 'skill_typescript', 'skill_nodejs', 'skill_postgresql', 'skill_docker']
  const existingSkills5 = await prisma.skill.findMany({
    where: { id: { in: job5Skills } },
    select: { id: true }
  })
  await prisma.jobRequiredSkill.deleteMany({ where: { jobId: job5Id } })
  if (existingSkills5.length > 0) {
    await prisma.jobRequiredSkill.createMany({
      data: existingSkills5.map((skill, index) => ({ jobId: job5Id, skillId: skill.id, orderHint: index }))
    })
  }

  await prisma.jobScreeningQuestion.deleteMany({ where: { jobId: job5Id } })
  await prisma.jobScreeningQuestion.createMany({
    data: [
      { jobId: job5Id, question: 'Have you built HR or ERP systems before? Describe the scope.', isRequired: true },
      { jobId: job5Id, question: 'How would you design the payroll calculation module?', isRequired: true }
    ]
  })

  await prisma.jobLanguageRequirement.deleteMany({ where: { jobId: job5Id } })
  await prisma.jobLanguageRequirement.create({
    data: { jobId: job5Id, languageCode: 'en', proficiency: LanguageProficiency.CONVERSATIONAL }
  })

  console.log('  ✅ Job 5: HR Management System')

  // Job 6: Real-time Collaboration Tool
  const job6Id = 'demo_job_collab_tool'
  await prisma.jobPost.upsert({
    where: { id: job6Id },
    update: {},
    create: {
      id: job6Id,
      clientId,
      title: 'Create Real-time Collaboration Whiteboard Application',
      description: `Building a Miro/FigJam-like collaborative whiteboard for our design and product teams.

📋 Project Overview:
Develop a real-time collaborative whiteboard where multiple users can brainstorm, draw, and organize ideas together.

🎯 Key Features:
• Infinite canvas with zoom/pan
• Drawing tools: Pen, shapes, arrows, sticky notes
• Real-time collaboration with cursor presence
• Text editing with rich formatting
• Image upload and embedding
• Templates library
• Export to PNG/PDF/SVG
• Version history and undo/redo
• Comments and reactions
• Video/voice chat integration (optional)

💻 Technical Challenges:
• Real-time sync with conflict resolution (CRDT/OT)
• Canvas rendering performance (WebGL/Canvas API)
• Efficient data structure for large boards
• Low-latency collaboration

💻 Tech Stack:
• Frontend: React with TypeScript, Canvas/WebGL
• Real-time: WebSocket, Y.js or Automerge for CRDT
• Backend: Node.js
• Database: PostgreSQL + Redis

📅 Timeline: 3-4 months
💰 Budget: $20,000 - $32,000

Must have experience with real-time collaborative applications or canvas-based tools.`,
      specialtyId: 'specialty_frontend_dev',
      experienceLevel: JobExperienceLevel.EXPERT,
      locationType: JobLocationType.REMOTE,
      paymentMode: JobPaymentMode.FIXED_SINGLE,
      budgetAmount: 26000,
      budgetCurrency: 'USD',
      duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
      status: JobStatus.PUBLISHED,
      visibility: JobVisibility.PUBLIC,
      publishedAt: new Date('2024-12-20')
    }
  })

  const job6Skills = ['skill_react', 'skill_typescript', 'skill_nodejs', 'skill_redis', 'skill_git']
  const existingSkills6 = await prisma.skill.findMany({
    where: { id: { in: job6Skills } },
    select: { id: true }
  })
  await prisma.jobRequiredSkill.deleteMany({ where: { jobId: job6Id } })
  if (existingSkills6.length > 0) {
    await prisma.jobRequiredSkill.createMany({
      data: existingSkills6.map((skill, index) => ({ jobId: job6Id, skillId: skill.id, orderHint: index }))
    })
  }

  await prisma.jobScreeningQuestion.deleteMany({ where: { jobId: job6Id } })
  await prisma.jobScreeningQuestion.createMany({
    data: [
      { jobId: job6Id, question: 'Have you worked with CRDT or OT for real-time collaboration? Explain your approach.', isRequired: true },
      { jobId: job6Id, question: 'Share examples of canvas-based or drawing applications you have built.', isRequired: true },
      { jobId: job6Id, question: 'How would you optimize rendering for a large canvas with many objects?', isRequired: false }
    ]
  })

  await prisma.jobLanguageRequirement.deleteMany({ where: { jobId: job6Id } })
  await prisma.jobLanguageRequirement.create({
    data: { jobId: job6Id, languageCode: 'en', proficiency: LanguageProficiency.FLUENT }
  })

  console.log('  ✅ Job 6: Real-time Collaboration Tool')

  // Job 7: Learning Management System
  const job7Id = 'demo_job_lms'
  await prisma.jobPost.upsert({
    where: { id: job7Id },
    update: {},
    create: {
      id: job7Id,
      clientId,
      title: 'Build Online Learning Platform (LMS) with Video Streaming',
      description: `Creating an online learning platform for corporate training programs.

📋 Project Overview:
Develop a Learning Management System (LMS) that supports video courses, quizzes, certifications, and progress tracking for enterprise clients.

🎯 Key Features:
• Course Management: Create, organize, publish courses
• Video Streaming: Adaptive bitrate, resume playback, DRM protection
• Interactive Content: Quizzes, assignments, discussions
• Progress Tracking: Completion status, time spent, scores
• Certification: Auto-generate certificates upon completion
• User Management: Bulk enrollment, groups, roles
• Analytics: Learning analytics, engagement reports
• Mobile App: iOS/Android companion app (Phase 2)

💻 Technical Requirements:
• Video hosting with CDN (AWS MediaConvert, Cloudflare Stream)
• SCORM/xAPI compliance for content interoperability
• SSO integration (SAML, OAuth)
• White-labeling support

💻 Tech Stack:
• Frontend: Next.js, TypeScript, Tailwind CSS
• Backend: NestJS with GraphQL
• Database: PostgreSQL
• Video: AWS MediaConvert + CloudFront or Mux
• Storage: S3

📅 Timeline: 4-6 months
💰 Budget: $30,000 - $50,000

Experience with LMS, video streaming, or EdTech platforms is highly preferred.`,
      specialtyId: 'specialty_fullstack_dev',
      experienceLevel: JobExperienceLevel.EXPERT,
      locationType: JobLocationType.REMOTE,
      paymentMode: JobPaymentMode.FIXED_SINGLE,
      budgetAmount: 40000,
      budgetCurrency: 'USD',
      duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
      status: JobStatus.PUBLISHED,
      visibility: JobVisibility.PUBLIC,
      publishedAt: new Date('2024-12-21')
    }
  })

  const job7Skills = ['skill_nextjs', 'skill_typescript', 'skill_nestjs', 'skill_graphql', 'skill_aws']
  const existingSkills7 = await prisma.skill.findMany({
    where: { id: { in: job7Skills } },
    select: { id: true }
  })
  await prisma.jobRequiredSkill.deleteMany({ where: { jobId: job7Id } })
  if (existingSkills7.length > 0) {
    await prisma.jobRequiredSkill.createMany({
      data: existingSkills7.map((skill, index) => ({ jobId: job7Id, skillId: skill.id, orderHint: index }))
    })
  }

  await prisma.jobScreeningQuestion.deleteMany({ where: { jobId: job7Id } })
  await prisma.jobScreeningQuestion.createMany({
    data: [
      { jobId: job7Id, question: 'Have you built LMS or EdTech platforms before? Share your experience.', isRequired: true },
      { jobId: job7Id, question: 'How would you implement video streaming with DRM protection?', isRequired: true },
      { jobId: job7Id, question: 'Are you familiar with SCORM or xAPI standards?', isRequired: false }
    ]
  })

  await prisma.jobLanguageRequirement.deleteMany({ where: { jobId: job7Id } })
  await prisma.jobLanguageRequirement.create({
    data: { jobId: job7Id, languageCode: 'en', proficiency: LanguageProficiency.FLUENT }
  })

  console.log('  ✅ Job 7: Learning Management System')

  // Job 8: IoT Dashboard
  const job8Id = 'demo_job_iot_dashboard'
  await prisma.jobPost.upsert({
    where: { id: job8Id },
    update: {},
    create: {
      id: job8Id,
      clientId,
      title: 'Develop IoT Monitoring Dashboard for Smart Factory',
      description: `We're digitizing our manufacturing facility and need an IoT monitoring dashboard.

📋 Project Overview:
Build a real-time monitoring dashboard to visualize data from 500+ IoT sensors across our factory floor. The system should provide alerts, analytics, and predictive maintenance insights.

🎯 Key Features:
• Real-time Data Visualization: Live sensor readings, gauges, charts
• Factory Floor Map: Interactive layout with sensor locations
• Alert System: Threshold-based alerts, escalation rules
• Historical Data: Time-series analysis, trend visualization
• Predictive Maintenance: ML-based anomaly detection
• Reports: Shift reports, OEE calculations, downtime analysis
• Mobile Access: Responsive design for tablets on factory floor

💻 Technical Requirements:
• Handle 10,000+ data points per second
• Time-series database for sensor data
• Real-time updates via WebSocket/MQTT
• Integration with existing SCADA systems

💻 Tech Stack:
• Frontend: React with TypeScript, D3.js for visualizations
• Backend: Node.js or Python
• Database: TimescaleDB or InfluxDB for time-series
• Message Queue: MQTT broker, Kafka
• ML: Python with scikit-learn for anomaly detection

📅 Timeline: 3-4 months
💰 Budget: $25,000 - $38,000

Experience with IoT, industrial systems, or time-series data is required.`,
      specialtyId: 'specialty_backend_dev',
      experienceLevel: JobExperienceLevel.EXPERT,
      locationType: JobLocationType.REMOTE,
      paymentMode: JobPaymentMode.FIXED_SINGLE,
      budgetAmount: 32000,
      budgetCurrency: 'USD',
      duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
      status: JobStatus.PUBLISHED,
      visibility: JobVisibility.PUBLIC,
      publishedAt: new Date('2024-12-22')
    }
  })

  const job8Skills = ['skill_react', 'skill_typescript', 'skill_python', 'skill_docker', 'skill_aws']
  const existingSkills8 = await prisma.skill.findMany({
    where: { id: { in: job8Skills } },
    select: { id: true }
  })
  await prisma.jobRequiredSkill.deleteMany({ where: { jobId: job8Id } })
  if (existingSkills8.length > 0) {
    await prisma.jobRequiredSkill.createMany({
      data: existingSkills8.map((skill, index) => ({ jobId: job8Id, skillId: skill.id, orderHint: index }))
    })
  }

  await prisma.jobScreeningQuestion.deleteMany({ where: { jobId: job8Id } })
  await prisma.jobScreeningQuestion.createMany({
    data: [
      { jobId: job8Id, question: 'Describe your experience with IoT or industrial monitoring systems.', isRequired: true },
      { jobId: job8Id, question: 'How would you handle high-frequency sensor data ingestion?', isRequired: true },
      { jobId: job8Id, question: 'Have you worked with time-series databases? Which ones?', isRequired: false }
    ]
  })

  await prisma.jobLanguageRequirement.deleteMany({ where: { jobId: job8Id } })
  await prisma.jobLanguageRequirement.create({
    data: { jobId: job8Id, languageCode: 'en', proficiency: LanguageProficiency.CONVERSATIONAL }
  })

  console.log('  ✅ Job 8: IoT Monitoring Dashboard')

  console.log('\n✅ Successfully created 5 extra jobs!')
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export async function seedDemoExtraJobs(): Promise<void> {
  console.log('\n📋 Seeding Demo Extra Jobs...\n')

  const clientId = await getClientId()
  
  if (!clientId) {
    console.error(`❌ Client ${CLIENT_EMAIL} not found! Please run 'npx prisma db seed -- demo' first.`)
    return
  }

  await runStep('Creating Extra Jobs', () => seedExtraJobs(clientId))

  console.log('\n✅ Demo Extra Jobs seeding completed!')
  console.log(`\n📧 Jobs added for: ${CLIENT_EMAIL}`)
  console.log('   - E-commerce Platform ($28,000)')
  console.log('   - HR Management System ($32,000)')
  console.log('   - Real-time Collaboration Tool ($26,000)')
  console.log('   - Learning Management System ($40,000)')
  console.log('   - IoT Monitoring Dashboard ($32,000)')
}
