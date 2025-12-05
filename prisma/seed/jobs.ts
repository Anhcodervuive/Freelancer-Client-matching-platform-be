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

const JOB_POSTS: JobSeed[] = [
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
        }
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
