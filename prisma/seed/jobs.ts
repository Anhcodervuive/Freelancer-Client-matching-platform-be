import {
        JobDurationCommitment,
        JobExperienceLevel,
        JobLocationType,
        JobPaymentMode,
        JobStatus,
        JobVisibility,
        LanguageProficiency,
        Prisma,
        Role
} from '../../src/generated/prisma'
import { prisma, runStep } from './_utils'

type JobLanguageSeed = {
        code: string
        proficiency: LanguageProficiency
}

type JobScreeningSeed = {
        question: string
        isRequired?: boolean
}

type JobSeed = {
        clientEmail: string
        specialtyId: string
        title: string
        description: string
        paymentMode: JobPaymentMode
        budgetAmount?: number
        budgetCurrency?: string
        duration?: JobDurationCommitment | null
        experienceLevel: JobExperienceLevel
        locationType?: JobLocationType
        preferredLocations?: Prisma.InputJsonValue
        visibility?: JobVisibility
        status?: JobStatus
        publishedAt?: Date
        languages?: JobLanguageSeed[]
        requiredSkills: string[]
        screeningQuestions?: JobScreeningSeed[]
        customTerms?: Prisma.InputJsonValue
}

const SKIP_EXISTING_JOBS = (process.env.SEED_SKIP_EXISTING_JOBS ?? '').toLowerCase() === 'true'

const BASE_JOB_POSTS: JobSeed[] = [
        {
                clientEmail: 'linh.tran@client.test',
                specialtyId: 'specialty_fullstack_dev',
                title: 'Build B2B fintech account onboarding platform',
                description:
                        'Design a multi-step onboarding for enterprise customers with KYC/AML, e-signature, and an internal approval dashboard. The system must provide full audit logging, be multi-tenant, and extend to multiple partner banks.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 25000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.HYBRID,
                preferredLocations: [
                        { country: 'Vietnam', timeZone: 'GMT+7' },
                        { country: 'Singapore', timeZone: 'GMT+8' }
                ],
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-04-10T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.FLUENT },
                        { code: 'vi', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_typescript', 'skill_nodejs', 'skill_react', 'skill_graphql', 'skill_postgresql'],
                screeningQuestions: [
                        { question: 'Have you implemented eKYC/AML flows in Southeast Asia markets before?' },
                        { question: 'Describe how you design audit trails and fine-grained access controls.', isRequired: true }
                ],
                customTerms: { timezoneOverlapHours: 4, securityPolicies: ['SOC2', 'MFA-required'] }
        },
        {
                clientEmail: 'sylvia.chen@client.test',
                specialtyId: 'specialty_data_engineering',
                title: 'Realtime clickstream and attribution warehouse',
                description:
                        'Unify web/app analytics, ads spend, and CRM events into a governed warehouse with near real-time dashboards. Requires CDC ingestion, data contracts, and warehouse-first transformations for marketing science.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 21000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-04-12T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                requiredSkills: ['skill_data_engineering', 'skill_airflow', 'skill_python', 'skill_sql', 'skill_gcp'],
                screeningQuestions: [
                        { question: 'How do you design CDC for mixed Postgres/MySQL sources?', isRequired: true },
                        { question: 'Share an example of enforcing schema/data contracts for marketing events.' }
                ],
                customTerms: { warehouse: 'BigQuery', biTool: 'Looker', latencyMinutes: 15 }
        },
        {
                clientEmail: 'maria.rossi@client.test',
                specialtyId: 'specialty_uiux',
                title: 'Mobile banking onboarding and card activation UX',
                description:
                        'Design a frictionless onboarding and debit card activation flow with biometrics, liveness, and tiered KYC. Needs high accessibility, error handling, and in-app education for cross-sell.',
                paymentMode: JobPaymentMode.FIXED_SINGLE,
                budgetAmount: 9500,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.HYBRID,
                preferredLocations: [{ country: 'Italy', city: 'Rome' }],
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-03-22T00:00:00.000Z'),
                languages: [
                        { code: 'it', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_figma', 'skill_ux_research', 'skill_design_systems', 'skill_html', 'skill_css'],
                screeningQuestions: [
                        { question: 'Provide a recent flow you designed that reduced drop-off during onboarding.', isRequired: true },
                        { question: 'How would you communicate security controls without harming UX?' }
                ]
        },
        {
                clientEmail: 'noah.wilson@client.test',
                specialtyId: 'specialty_security_operations',
                title: 'Security hardening and observability for fintech core',
                description:
                        'Audit and improve IAM, threat detection, and secure SDLC for a fintech transaction core. Deliver Terraform guardrails, SIEM dashboards, runbooks, and purple-team exercises with measurable outcomes.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 24000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-04-30T00:00:00.000Z'),
                languages: [{ code: 'en', proficiency: LanguageProficiency.NATIVE }],
                requiredSkills: ['skill_aws', 'skill_security_compliance', 'skill_kubernetes', 'skill_terraform', 'skill_ci_cd'],
                screeningQuestions: [
                        { question: 'Describe how you set up alert fatigue reduction and runbooks.', isRequired: true },
                        { question: 'Share an example of threat modeling you performed for financial APIs.' }
                ],
                customTerms: { requiresISO: true, prefersSOC2: true, runbookFormat: 'Markdown/Confluence' }
        },
        {
                clientEmail: 'fatima.khan@client.test',
                specialtyId: 'specialty_machine_learning',
                title: 'Conversational agent for agritech support',
                description:
                        'Build an LLM-powered assistant that helps farmers troubleshoot irrigation equipment and schedule maintenance. Needs retrieval grounding from manuals/telemetry, safety filters, and multilingual support.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 22000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-05-12T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.FLUENT },
                        { code: 'es', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_python', 'skill_pandas', 'skill_tensorflow', 'skill_gcp', 'skill_rest_api'],
                screeningQuestions: [
                        { question: 'How do you design retrieval and grounding for safety-critical chatbots?', isRequired: true },
                        { question: 'Share your experience evaluating hallucinations and response safety.' }
                ],
                customTerms: { prefersVectorDB: 'pgvector', prefersLLM: 'GPT-4o', safetyReview: true }
        },
        {
                clientEmail: 'linh.tran@client.test',
                specialtyId: 'specialty_fullstack_dev',
                title: 'Customer success portal with SLA timers',
                description:
                        'Develop a portal where B2B customers raise incidents, track SLAs, and collaborate on runbooks. Includes role-based access, timeline/audit logs, and webhook integrations to internal tooling.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 17000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-03-18T00:00:00.000Z'),
                languages: [{ code: 'en', proficiency: LanguageProficiency.FLUENT }],
                requiredSkills: ['skill_nodejs', 'skill_typescript', 'skill_react', 'skill_postgresql', 'skill_redis'],
                screeningQuestions: [
                        { question: 'How would you implement SLA timers and escalation rules?', isRequired: true },
                        { question: 'Describe your strategy for event/audit logging and exports.' }
                ],
                customTerms: { prefersQueue: 'BullMQ', observability: ['OpenTelemetry'] }
        },
        {
                clientEmail: 'diep.le@client.test',
                specialtyId: 'specialty_design_systems',
                title: 'Design tokens and theming for franchise rollout',
                description:
                        'Build a token-based design system that can be themed per franchise while keeping accessibility baselines. Deliver Storybook docs, Figma libraries, and CI checks to prevent token regressions.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 10500,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-02-26T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.CONVERSATIONAL },
                        { code: 'vi', proficiency: LanguageProficiency.NATIVE }
                ],
                requiredSkills: ['skill_figma', 'skill_design_systems', 'skill_react', 'skill_typescript', 'skill_tailwind'],
                screeningQuestions: [
                        { question: 'Show how you manage multi-brand theming with tokens.', isRequired: true },
                        { question: 'How do you enforce accessibility in components and CI?' }
                ],
                customTerms: { prefersTheming: 'CSS variables', docsFormat: 'Storybook' }
        },
        {
                clientEmail: 'paulina.rivera@client.test',
                specialtyId: 'specialty_cross_platform_mobile',
                title: 'Field service mobile app with offline sync',
                description:
                        'Create a Flutter app for technicians to log jobs, capture photos, and sync checklists with offline-first behavior. Needs push notifications, background sync, role-based permissions, and analytics events.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 15000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-03-06T00:00:00.000Z'),
                languages: [
                        { code: 'es', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_flutter', 'skill_rest_api', 'skill_ci_cd', 'skill_postgresql', 'skill_graphql'],
                screeningQuestions: [
                        { question: 'How would you design offline-first data sync and conflict resolution?', isRequired: true },
                        { question: 'Describe your approach to background tasks and battery efficiency.' }
                ],
                customTerms: { prefersPushProvider: 'Firebase', requiresMobileAnalytics: true }
        },
        {
                clientEmail: 'minh.nguyen@client.test',
                specialtyId: 'specialty_frontend_dev',
                title: 'Content localization pipeline for travel portal',
                description:
                        'Implement a localization-ready frontend that supports structured translations, locale-driven routing, and experimentation. Includes CMS integration, caching, and robust QA for SEO across locales.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 12500,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-04-14T00:00:00.000Z'),
                languages: [
                        { code: 'vi', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                requiredSkills: ['skill_nextjs', 'skill_tailwind', 'skill_graphql', 'skill_rest_api', 'skill_react'],
                screeningQuestions: [
                        { question: 'How do you structure translations and fallbacks in Next.js?', isRequired: true },
                        { question: 'Share your approach to SEO and caching for multi-locale sites.' }
                ],
                customTerms: { prefersCDN: 'Cloudflare', cms: 'Contentful' }
        },
        {
                clientEmail: 'fatima.khan@client.test',
                specialtyId: 'specialty_test_automation',
                title: 'Mobile regression suite for wearable IoT companion app',
                description:
                        'Create Playwright/Appium-based regression for Android/iOS companion apps that pair with wearable devices. Cover pairing flows, BLE events, notifications, and backend API checks with dashboards.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 13000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-04-01T00:00:00.000Z'),
                languages: [{ code: 'en', proficiency: LanguageProficiency.FLUENT }],
                requiredSkills: ['skill_playwright', 'skill_cypress', 'skill_rest_api', 'skill_jest', 'skill_ci_cd'],
                screeningQuestions: [
                        { question: 'How do you run reliable mobile tests in CI labs?', isRequired: true },
                        { question: 'Share how you validate BLE-driven events end to end.' }
                ],
                customTerms: { deviceMatrix: ['Pixel 7', 'iPhone 14'], prefersRemoteLab: true }
        },
        {
                clientEmail: 'minh.nguyen@client.test',
                specialtyId: 'specialty_frontend_dev',
                title: 'Optimize tour-booking web and campaign landing pages',
                description:
                        'Improve page speed, SEO, and checkout experience for a Central Vietnam tour booking site. Work includes building a component library, optimizing images/video, and measuring conversion through A/B variants.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 12000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-03-20T00:00:00.000Z'),
                languages: [{ code: 'vi', proficiency: LanguageProficiency.NATIVE }],
                requiredSkills: ['skill_react', 'skill_nextjs', 'skill_tailwind', 'skill_rest_api', 'skill_graphql'],
                screeningQuestions: [
                        { question: 'Share an example where you improved Core Web Vitals for e-commerce or booking.', isRequired: false },
                        { question: 'What QA process do you propose for A/B variants?', isRequired: true }
                ]
        },
        {
                clientEmail: 'huong.pham@client.test',
                specialtyId: 'specialty_machine_learning',
                title: 'Bio-forecasting dashboard from IoT lab data',
                description:
                        'Ingest sensor data from lab devices, normalize the pipeline, and build anomaly-forecasting models. Needs realtime dashboards, alerting, and exportable reports for scientists without deep technical skills.',
                paymentMode: JobPaymentMode.FIXED_SINGLE,
                budgetAmount: 18000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-05-01T00:00:00.000Z'),
                languages: [{ code: 'en', proficiency: LanguageProficiency.FLUENT }],
                requiredSkills: ['skill_python', 'skill_pandas', 'skill_scikit', 'skill_airflow', 'skill_gcp'],
                screeningQuestions: [
                        { question: 'How have you handled noisy or lossy sensor data streams?', isRequired: false },
                        { question: 'Explain how you operate ML models with drift monitoring and alerts.', isRequired: true }
                ]
        },
        {
                clientEmail: 'sylvia.chen@client.test',
                specialtyId: 'specialty_cloud_architecture',
                title: 'Optimize OMS and integrate warehouse & logistics for SEA retail',
                description:
                        'Design a multi-region OMS architecture for SEA countries with near-real-time inventory sync and carrier integrations. Requires high availability, SLA monitoring, and readiness for flash-sale traffic.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 30000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.MORE_THAN_SIX_MONTHS,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.HYBRID,
                preferredLocations: [{ country: 'Singapore' }, { country: 'Vietnam' }],
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-04-25T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.FLUENT },
                        { code: 'vi', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_aws', 'skill_kubernetes', 'skill_redis', 'skill_postgresql', 'skill_terraform'],
                screeningQuestions: [
                        { question: 'What experience do you have with multi-region active-active or active-passive?', isRequired: false },
                        { question: 'How would you design scaling architecture for peak sale periods?', isRequired: true }
                ],
                customTerms: { requiresOnsite: true, onsiteCity: 'Singapore', preferredVendors: ['AWS', 'Cloudflare'] }
        },
        {
                clientEmail: 'diep.le@client.test',
                specialtyId: 'specialty_uiux',
                title: 'Design premium homestay booking experience',
                description:
                        'Create a multi-step booking flow with service add-ons, flexible check-in schedules, and a green brand story. Targeting international guests, so needs bilingual, accessible design with a ready design system.',
                paymentMode: JobPaymentMode.FIXED_SINGLE,
                budgetAmount: 8000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-02-15T00:00:00.000Z'),
                languages: [
                        { code: 'vi', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_figma', 'skill_design_systems', 'skill_ux_research', 'skill_html', 'skill_css'],
                screeningQuestions: [
                        { question: 'Share a recent high-fidelity prototype you delivered.', isRequired: false },
                        { question: 'How would you gather insights from international travelers?' }
                ]
        },
        {
                clientEmail: 'paulina.rivera@client.test',
                specialtyId: 'specialty_cross_platform_mobile',
                title: 'Build a Latin American specialty marketplace app',
                description:
                        'Develop a marketplace app for regional specialty goods with multilingual support, local payments, and loyalty. Needs offline-friendly UX, personalized push notifications, and CMS integration for content management.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 14000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-04-05T00:00:00.000Z'),
                languages: [
                        { code: 'es', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_flutter', 'skill_rest_api', 'skill_graphql', 'skill_ci_cd', 'skill_postgresql'],
                screeningQuestions: [
                        { question: 'How would you integrate and test local payments such as Pix/Stripe/etc.?', isRequired: false },
                        { question: 'Share your experience with segmenting and personalizing push notifications.' }
                ]
        },
        {
                clientEmail: 'noah.wilson@client.test',
                specialtyId: 'specialty_security_operations',
                title: 'Build HIPAA-compliant backend for post-op care app',
                description:
                        'Mobile/web platform for post-surgery patients with medication reminders, doctor chat, and secure medical data storage. Needs audit trails, data encryption, fine-grained permissions, and anomaly alerts.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 20000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.INVITE_ONLY,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-03-30T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.NATIVE }
                ],
                requiredSkills: ['skill_nodejs', 'skill_typescript', 'skill_aws', 'skill_security_compliance', 'skill_postgresql'],
                screeningQuestions: [
                        { question: 'Which healthcare systems have you implemented HIPAA/GDPR compliance for?' },
                        { question: 'How would you handle incidents when abnormal access to medical data is detected?' }
                ],
                customTerms: { compliance: ['HIPAA'], dataResidency: 'US', securityReview: true }
        },
        {
                clientEmail: 'fatima.khan@client.test',
                specialtyId: 'specialty_data_engineering',
                title: 'Smart irrigation forecasting data pipeline',
                description:
                        'Collect climate, satellite, and agricultural sensor data to recommend automated irrigation. Needs a reliable pipeline, data quality checks, historical storage, and APIs for the data science team.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 18000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-04-18T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                requiredSkills: ['skill_data_engineering', 'skill_airflow', 'skill_python', 'skill_sql', 'skill_aws'],
                screeningQuestions: [
                        { question: 'How do you ensure streaming data quality?', isRequired: false },
                        { question: 'Describe the data contract design between the pipeline and the ML team.', isRequired: true }
                ]
        },
        {
                clientEmail: 'maria.rossi@client.test',
                specialtyId: 'specialty_unity_dev',
                title: 'AR lookbook and fitting scheduler for fashion boutique',
                description:
                        'AR try-on app that syncs product catalogs and books in-store fitting appointments. Requires conversion tracking, social sharing, support for a wide range of iOS/Android devices, and an admin content panel.',
                paymentMode: JobPaymentMode.FIXED_SINGLE,
                budgetAmount: 16000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.HYBRID,
                preferredLocations: [{ country: 'Italy', city: 'Milan' }],
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-03-12T00:00:00.000Z'),
                languages: [
                        { code: 'it', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_unity', 'skill_csharp', 'skill_blender', 'skill_rest_api', 'skill_graphql'],
                screeningQuestions: [
                        { question: 'How have you optimized AR performance on mid-tier devices?' },
                        { question: 'What is your experience connecting AR apps to a CMS/backoffice?' }
                ]
        },
        {
                clientEmail: 'andrew.taylor@client.test',
                specialtyId: 'specialty_business_intelligence',
                title: 'Self-serve BI portal with governed datasets',
                description:
                        'Build a Power BI–backed portal where consultants can explore governed datasets, schedule data refreshes, and publish curated dashboards. Includes role-based access, lineage tracking, and semantic layer definitions.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 15000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-04-08T00:00:00.000Z'),
                languages: [{ code: 'en', proficiency: LanguageProficiency.NATIVE }],
                requiredSkills: ['skill_powerbi', 'skill_sql', 'skill_data_engineering', 'skill_airflow', 'skill_python'],
                screeningQuestions: [
                        { question: 'Share an example of a governed semantic model you shipped.', isRequired: true },
                        { question: 'How do you enforce data lineage and refresh SLAs in BI environments?' }
                ],
                customTerms: { preferredWarehouse: 'Snowflake', accessModel: 'RBAC', needsDataCatalog: true }
        },
        {
                clientEmail: 'paulina.rivera@client.test',
                specialtyId: 'specialty_fullstack_dev',
                title: 'Marketplace vendor success console',
                description:
                        'Create a console for marketplace vendors to manage catalog health, order issues, and loyalty campaigns. Needs granular permissions, audit-ready event logging, and embeddable analytics widgets.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 13000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-03-28T00:00:00.000Z'),
                languages: [
                        { code: 'es', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_nextjs', 'skill_nodejs', 'skill_typescript', 'skill_postgresql', 'skill_redis'],
                screeningQuestions: [
                        { question: 'How do you design tenant isolation for vendor-facing portals?', isRequired: true },
                        { question: 'Describe your approach to audit logging and exportable reports.' }
                ]
        },
        {
                clientEmail: 'diep.le@client.test',
                specialtyId: 'specialty_vr_ar',
                title: 'Interactive 3D showcase for green architecture studio',
                description:
                        'Develop an immersive 3D web experience to showcase sustainable buildings with day/night lighting, material swaps, and guided tours. Should run smoothly on modern browsers and support VR headset viewing.',
                paymentMode: JobPaymentMode.FIXED_SINGLE,
                budgetAmount: 11000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-02-28T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.CONVERSATIONAL },
                        { code: 'vi', proficiency: LanguageProficiency.NATIVE }
                ],
                requiredSkills: ['skill_unity', 'skill_blender', 'skill_react', 'skill_typescript', 'skill_css'],
                screeningQuestions: [
                        { question: 'Share a 3D or WebXR experience you optimized for browser performance.', isRequired: true },
                        { question: 'How would you balance visual fidelity with load times for global visitors?' }
                ],
                customTerms: { expectsWebXR: true, prefersStaticHosting: true }
        },
        {
                clientEmail: 'maria.rossi@client.test',
                specialtyId: 'specialty_design_systems',
                title: 'Design system refresh for omnichannel retail',
                description:
                        'Audit the current design system, expand component coverage, and deliver tokens that work across web, kiosks, and mobile apps. Needs accessibility baselines, responsive patterns, and Storybook handoff.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 9000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.HYBRID,
                preferredLocations: [{ country: 'Italy', city: 'Milan' }],
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-04-02T00:00:00.000Z'),
                languages: [
                        { code: 'it', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_figma', 'skill_design_systems', 'skill_react', 'skill_typescript', 'skill_tailwind'],
                screeningQuestions: [
                        { question: 'Show an example of accessibility-first components you shipped.', isRequired: true },
                        { question: 'What is your process for tokens, theming, and documentation readiness?' }
                ],
                customTerms: { prefersDesignTokens: true, handoffTool: 'Storybook/Figma' }
        },
        {
                clientEmail: 'fatima.khan@client.test',
                specialtyId: 'specialty_data_science',
                title: 'Crop-yield forecasting models with explainability',
                description:
                        'Train time-series models that predict irrigation needs and yield impact for arid-region crops. Pipelines should include feature stores, drift monitoring, and explainability reports for agronomists.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 19000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-05-06T00:00:00.000Z'),
                languages: [{ code: 'en', proficiency: LanguageProficiency.FLUENT }],
                requiredSkills: ['skill_python', 'skill_pandas', 'skill_scikit', 'skill_tensorflow', 'skill_gcp'],
                screeningQuestions: [
                        { question: 'How do you validate models against extreme weather scenarios?', isRequired: true },
                        { question: 'Describe your approach to explainability for non-technical stakeholders.' }
                ],
                customTerms: { requiresFeatureStore: true, preferredPlatform: 'GCP' }
        },
        {
                clientEmail: 'noah.wilson@client.test',
                specialtyId: 'specialty_test_automation',
                title: 'Automation and regression suite for healthcare web app',
                description:
                        'Expand automated regression coverage for the post-op care platform, including web, API, and accessibility checks. Integrate with CI, produce traceable reports, and set up synthetic monitoring for login flows.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 10000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-03-10T00:00:00.000Z'),
                languages: [{ code: 'en', proficiency: LanguageProficiency.FLUENT }],
                requiredSkills: ['skill_playwright', 'skill_cypress', 'skill_rest_api', 'skill_jest', 'skill_ci_cd'],
                screeningQuestions: [
                        { question: 'What is your plan for handling fixtures and test data in CI?', isRequired: true },
                        { question: 'Share an example of accessibility testing you automated.' }
                ],
                customTerms: { compliance: ['HIPAA'], traceableReports: true }
        },
        {
                clientEmail: 'minh.nguyen@client.test',
                specialtyId: 'specialty_backend_dev',
                title: 'Event-driven order orchestration for marketplace sellers',
                description:
                        'Refactor the commerce backend into event-driven services that coordinate catalog updates, payouts, and dispute workflows. Include idempotent processors, replayable streams, and reconciliation dashboards for ops.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 18000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.HYBRID,
                preferredLocations: [{ country: 'Vietnam', city: 'Ho Chi Minh City' }],
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-05-20T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.FLUENT },
                        { code: 'vi', proficiency: LanguageProficiency.FLUENT }
                ],
                requiredSkills: ['skill_typescript', 'skill_nestjs', 'skill_nodejs', 'skill_postgresql', 'skill_redis'],
                screeningQuestions: [
                        { question: 'How do you guarantee idempotency across chained domain events?', isRequired: true },
                        { question: 'Describe your strategy for replaying historical events without duplicating side effects.' }
                ],
                customTerms: { observability: ['OpenTelemetry'], runbook: true }
        },
        {
                clientEmail: 'huong.pham@client.test',
                specialtyId: 'specialty_data_engineering',
                title: 'Data quality and lineage program for analytics mesh',
                description:
                        'Stand up data quality monitors, lineage graphs, and contracts across marketing, product, and billing domains. Deliver anomaly alerts, SLA tracking, and backfills with auditability for finance and GTM leads.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 20000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-05-28T00:00:00.000Z'),
                languages: [{ code: 'en', proficiency: LanguageProficiency.FLUENT }],
                requiredSkills: ['skill_data_engineering', 'skill_airflow', 'skill_sql', 'skill_python', 'skill_gcp'],
                screeningQuestions: [
                        { question: 'What metrics do you track to prove data quality improvements?', isRequired: true },
                        { question: 'Share an example lineage approach that helped a finance or billing team unblock reporting.' }
                ],
                customTerms: { prefers: ['Great Expectations', 'Dataform'], lineageRequired: true }
        },
        {
                clientEmail: 'diep.le@client.test',
                specialtyId: 'specialty_mlops',
                title: 'ML observability and feature store build-out',
                description:
                        'Implement a feature store and observability stack for ranking models. Cover data freshness, drift detection, canary rollouts, and rollbacks with a clear promotion checklist for MLOps and product managers.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 23000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.THREE_TO_SIX_MONTHS,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-06-02T00:00:00.000Z'),
                languages: [{ code: 'en', proficiency: LanguageProficiency.FLUENT }],
                requiredSkills: ['skill_python', 'skill_kubernetes', 'skill_docker', 'skill_ci_cd', 'skill_terraform'],
                screeningQuestions: [
                        { question: 'How do you set up drift alerts that avoid false positives for seasonality?', isRequired: true },
                        { question: 'Describe your rollout strategy for promoting models between staging and production.' }
                ],
                customTerms: { preferredFeatureStore: 'Feast', rollbacks: 'automated' }
        },
        {
                clientEmail: 'andrew.taylor@client.test',
                specialtyId: 'specialty_native_ios',
                title: 'Telehealth iOS app with secure video visits',
                description:
                        'Build a native iOS app for scheduled and on-demand telehealth. Include appointment booking, secure messaging, encrypted video calls, and offline-first chart notes that sync when connectivity resumes.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 16000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-05-18T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.NATIVE },
                        { code: 'fr', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_swift', 'skill_ios', 'skill_rest_api', 'skill_security_compliance', 'skill_ci_cd'],
                screeningQuestions: [
                        { question: 'How would you implement HIPAA-grade media handling for video calls?', isRequired: true },
                        { question: 'Describe your offline caching strategy for clinical notes and attachments.' }
                ],
                customTerms: { compliance: ['HIPAA'], videoProviderFlexible: true }
        },
        {
                clientEmail: 'paulina.rivera@client.test',
                specialtyId: 'specialty_uiux',
                title: 'Research-backed redesign for B2B billing console',
                description:
                        'Conduct discovery and redesign invoicing, dunning, and payments reconciliation screens. Deliver service blueprints, interaction design, accessibility checks, and stakeholder playback sessions with prototypes.',
                paymentMode: JobPaymentMode.FIXED_SINGLE,
                budgetAmount: 12000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-05-08T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.FLUENT },
                        { code: 'es', proficiency: LanguageProficiency.FLUENT }
                ],
                requiredSkills: ['skill_figma', 'skill_ux_research', 'skill_design_systems', 'skill_html', 'skill_css'],
                screeningQuestions: [
                        { question: 'Share how you validate billing flows with finance and support teams.', isRequired: true },
                        { question: 'How do you document interaction patterns so engineers can implement consistently?' }
                ]
        },
        {
                clientEmail: 'fatima.khan@client.test',
                specialtyId: 'specialty_business_intelligence',
                title: 'Revenue analytics and retention dashboards',
                description:
                        'Create finance-ready revenue dashboards for subscriptions and usage billing. Include churn cohorts, retention drivers, pipeline-to-revenue conversion, and scheduled executive summaries with annotations.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 14000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-05-04T00:00:00.000Z'),
                languages: [{ code: 'en', proficiency: LanguageProficiency.FLUENT }],
                requiredSkills: ['skill_sql', 'skill_powerbi', 'skill_tableau', 'skill_python', 'skill_data_engineering'],
                screeningQuestions: [
                        { question: 'What approach do you use to align finance and sales on revenue definitions?', isRequired: true },
                        { question: 'Describe a retention analysis you led and how it informed product changes.' }
                ],
                customTerms: { preferredWarehouse: 'Snowflake', executiveViews: true }
        },
        {
                clientEmail: 'maria.rossi@client.test',
                specialtyId: 'specialty_offensive_security',
                title: 'Application penetration test and threat modeling',
                description:
                        'Execute a full-scope penetration test on customer portals and APIs, then produce prioritized remediation and threat models. Include test plans, exploit proofs, retest cycles, and executive readouts.',
                paymentMode: JobPaymentMode.FIXED_SINGLE,
                budgetAmount: 13000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.LESS_THAN_ONE_MONTH,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-06-10T00:00:00.000Z'),
                languages: [{ code: 'en', proficiency: LanguageProficiency.NATIVE }],
                requiredSkills: ['skill_security_compliance', 'skill_rest_api', 'skill_python', 'skill_ci_cd', 'skill_kubernetes'],
                screeningQuestions: [
                        { question: 'Provide a sample test plan and reporting structure you use for pentests.', isRequired: true },
                        { question: 'How do you align findings with threat models that engineers can action?' }
                ],
                customTerms: { retestWindowDays: 30, requiresExecutiveSummary: true }
        },
        {
                clientEmail: 'linh.tran@client.test',
                specialtyId: 'specialty_product_strategy',
                title: 'North Star metrics and roadmap for SMB expense platform',
                description:
                        'Define the product strategy, North Star metric, and experiment roadmap for an SMB expense management platform. Facilitate workshops, prioritize bets, and create a 2-quarter delivery plan aligned with engineering capacity.',
                paymentMode: JobPaymentMode.FIXED_SINGLE,
                budgetAmount: 11000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.EXPERT,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-05-12T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.FLUENT },
                        { code: 'vi', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_ux_research', 'skill_data_analysis', 'skill_product_discovery', 'skill_figma', 'skill_sql'],
                screeningQuestions: [
                        { question: 'Share a time you defined a North Star metric and how you validated it.', isRequired: true },
                        { question: 'How do you translate research insights into a sequenced roadmap for engineers?' }
                ],
                customTerms: { workshopFormat: 'remote', cadenceWeeks: 2 }
        },
        {
                clientEmail: 'minh.nguyen@client.test',
                specialtyId: 'specialty_native_android',
                title: 'Courier Android app with geofencing and telemetry',
                description:
                        'Develop a courier-facing Android app that handles optimized routes, delivery proofs, barcode scanning, and geofenced status updates. Include background sync, offline resilience, and crash-free monitoring.',
                paymentMode: JobPaymentMode.FIXED_MILESTONE,
                budgetAmount: 15000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.HYBRID,
                preferredLocations: [{ country: 'Vietnam', city: 'Da Nang' }],
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-05-16T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.CONVERSATIONAL },
                        { code: 'vi', proficiency: LanguageProficiency.FLUENT }
                ],
                requiredSkills: ['skill_kotlin', 'skill_android', 'skill_react_native', 'skill_rest_api', 'skill_ci_cd'],
                screeningQuestions: [
                        { question: 'How do you ensure offline-safe workflows for scans and signatures?', isRequired: true },
                        { question: 'What telemetry stack do you use to monitor crash-free sessions and ANRs?' }
                ],
                customTerms: { mappingProvider: 'Google Maps', prefersExpo: false }
        },
        {
                clientEmail: 'noah.wilson@client.test',
                specialtyId: 'specialty_frontend_dev',
                title: 'Localization-ready marketing site with A/B testing',
                description:
                        'Rebuild the public marketing site with localization, performance budgets, and integrated experimentation. Provide CMS components, analytics events, and QA across browsers for rapid landing page launches.',
                paymentMode: JobPaymentMode.FIXED_SINGLE,
                budgetAmount: 9000,
                budgetCurrency: 'USD',
                duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                experienceLevel: JobExperienceLevel.INTERMEDIATE,
                locationType: JobLocationType.REMOTE,
                visibility: JobVisibility.PUBLIC,
                status: JobStatus.PUBLISHED,
                publishedAt: new Date('2024-05-14T00:00:00.000Z'),
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.FLUENT },
                        { code: 'de', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                requiredSkills: ['skill_nextjs', 'skill_react', 'skill_typescript', 'skill_css', 'skill_html'],
                screeningQuestions: [
                        { question: 'How do you structure experiments without slowing down content teams?', isRequired: true },
                        { question: 'Describe your approach to CLS/LCP budgets and monitoring.' }
                ],
                customTerms: { cms: 'headless', abTesting: 'built-in' }
        }
]

function generateJobSeeds(count: number): JobSeed[] {
        const specialties = [
                { id: 'specialty_fullstack_dev', skills: ['skill_typescript', 'skill_nodejs', 'skill_sql'] },
                { id: 'specialty_machine_learning', skills: ['skill_python', 'skill_machine_learning', 'skill_data_engineering'] },
                { id: 'specialty_data_engineering', skills: ['skill_data_engineering', 'skill_airflow', 'skill_sql'] },
                { id: 'specialty_uiux', skills: ['skill_figma', 'skill_design_systems', 'skill_html'] }
        ]

        return Array.from({ length: count }, (_, index) => {
                const idx = index + 1
                const specialty = specialties[index % specialties.length]
                const clientIndex = (index % 25) + 1
                const publishedAt = new Date(Date.UTC(2024, 0, 1 + index))

                return {
                        clientEmail: `ml.client${clientIndex}@client.test`,
                        specialtyId: specialty.id,
                        title: `Generated ML job ${idx}`,
                        description:
                                'Synthetic posting to diversify ML training data across invitations, applications, and offer outcomes.',
                        paymentMode: JobPaymentMode.FIXED_SINGLE,
                        budgetAmount: 6000 + idx * 10,
                        budgetCurrency: 'USD',
                        duration: JobDurationCommitment.ONE_TO_THREE_MONTHS,
                        experienceLevel: idx % 2 === 0 ? JobExperienceLevel.INTERMEDIATE : JobExperienceLevel.EXPERT,
                        locationType: idx % 3 === 0 ? JobLocationType.REMOTE : JobLocationType.HYBRID,
                        preferredLocations: idx % 3 === 0 ? Prisma.JsonNull : [{ country: 'Vietnam', timeZone: 'GMT+7' }],
                        visibility: JobVisibility.PUBLIC,
                        status: JobStatus.PUBLISHED,
                        publishedAt,
                        languages: [{ code: 'en', proficiency: LanguageProficiency.FLUENT }],
                        requiredSkills: specialty.skills,
                        screeningQuestions: [
                                { question: `What is your most relevant work sample for Generated ML job ${idx}?`, isRequired: true },
                                { question: 'How do you communicate progress and unblock risks?' }
                        ],
                        customTerms: { dataset: 'ml-bulk', slot: idx }
                }
        })
}

const JOB_POSTS: JobSeed[] = [
        ...BASE_JOB_POSTS,
        ...generateJobSeeds(Math.max(0, 300 - BASE_JOB_POSTS.length))
]

export async function seedJobs() {
        const [skills, specialties] = await Promise.all([
                prisma.skill.findMany({ select: { id: true } }),
                prisma.specialty.findMany({ select: { id: true } })
        ])

        const skillIds = new Set(skills.map(s => s.id))
        const specialtyIds = new Set(specialties.map(s => s.id))

        function filterExisting(ids: string[], validSet: Set<string>, label: string, owner: string) {
                const existing = ids.filter(id => validSet.has(id))
                const missing = ids.filter(id => !validSet.has(id))
                if (missing.length) {
                        console.warn(`⚠ Missing ${label} for ${owner}: ${missing.join(', ')}`)
                }
                return existing
        }

        await runStep('Seed job posts', async () => {
                for (const job of JOB_POSTS) {
                        const client = await prisma.user.findUnique({
                                where: { email: job.clientEmail },
                                select: { id: true, role: true }
                        })

                        if (!client) {
                                console.warn(`⚠ Skip job '${job.title}' because client ${job.clientEmail} not found`)
                                continue
                        }

                        if (client.role !== Role.CLIENT) {
                                console.warn(`⚠ Skip job '${job.title}' because ${job.clientEmail} is not a client`)
                                continue
                        }

                        if (!specialtyIds.has(job.specialtyId)) {
                                console.warn(`⚠ Skip job '${job.title}' because specialty ${job.specialtyId} is missing`)
                                continue
                        }

                        const existing = await prisma.jobPost.findFirst({
                                where: { clientId: client.id, title: job.title, isDeleted: false }
                        })

                        if (existing && SKIP_EXISTING_JOBS) {
                                console.log(`↷ Skip existing job '${job.title}' for ${job.clientEmail}`)
                                continue
                        }

                        const baseData = {
                                clientId: client.id,
                                specialtyId: job.specialtyId,
                                title: job.title,
                                description: job.description,
                                paymentMode: job.paymentMode,
                                budgetAmount: job.budgetAmount ? new Prisma.Decimal(job.budgetAmount) : null,
                                budgetCurrency: job.budgetAmount ? job.budgetCurrency ?? 'USD' : null,
                                duration: job.duration ?? null,
                                experienceLevel: job.experienceLevel,
                                locationType: job.locationType ?? JobLocationType.REMOTE,
                                preferredLocations: job.preferredLocations ?? Prisma.JsonNull,
                                customTerms: job.customTerms ?? Prisma.JsonNull,
                                visibility: job.visibility ?? JobVisibility.PUBLIC,
                                status: job.status ?? JobStatus.PUBLISHED,
                                publishedAt: job.publishedAt ?? new Date('2024-03-01T00:00:00.000Z')
                        }

                        const jobPost = existing
                                ? await prisma.jobPost.update({ where: { id: existing.id }, data: baseData })
                                : await prisma.jobPost.create({ data: baseData })

                        await prisma.jobLanguageRequirement.deleteMany({ where: { jobId: jobPost.id } })
                        if (job.languages?.length) {
                                await prisma.jobLanguageRequirement.createMany({
                                        data: job.languages.map(lang => ({
                                                jobId: jobPost.id,
                                                languageCode: lang.code,
                                                proficiency: lang.proficiency
                                        }))
                                })
                        }

                        const allowedSkills = filterExisting(job.requiredSkills, skillIds, 'skills', job.title)
                        await prisma.jobRequiredSkill.deleteMany({ where: { jobId: jobPost.id } })
                        if (allowedSkills.length) {
                                await prisma.jobRequiredSkill.createMany({
                                        data: allowedSkills.map((skillId, index) => ({
                                                jobId: jobPost.id,
                                                skillId,
                                                orderHint: index,
                                                isPreferred: false
                                        }))
                                })
                        }

                        await prisma.jobScreeningQuestion.deleteMany({ where: { jobId: jobPost.id } })
                        if (job.screeningQuestions?.length) {
                                await prisma.jobScreeningQuestion.createMany({
                                        data: job.screeningQuestions.map((question, index) => ({
                                                jobId: jobPost.id,
                                                question: question.question,
                                                orderIndex: index,
                                                isRequired: question.isRequired ?? true
                                        }))
                                })
                        }
                }
        })
}
