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
                title: 'Xây dựng nền tảng onboarding tài khoản cho fintech B2B',
                description:
                        'Thiết kế onboarding đa bước cho khách hàng doanh nghiệp, cần KYC/AML, ký số hợp đồng và dashboard phê duyệt nội bộ. Hệ thống phải audit logging đầy đủ, multi-tenant và mở rộng sang nhiều ngân hàng đối tác.',
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
                        { question: 'Bạn đã từng triển khai eKYC/AML ở thị trường Đông Nam Á chưa?' },
                        { question: 'Mô tả cách bạn thiết kế audit trail và kiểm soát phân quyền chi tiết.', isRequired: true }
                ],
                customTerms: { timezoneOverlapHours: 4, securityPolicies: ['SOC2', 'MFA-required'] }
        },
        {
                clientEmail: 'minh.nguyen@client.test',
                specialtyId: 'specialty_frontend_dev',
                title: 'Tối ưu web booking tour và trang landing chiến dịch',
                description:
                        'Cần cải thiện tốc độ tải trang, SEO và trải nghiệm thanh toán cho trang đặt tour miền Trung. Dự án bao gồm xây dựng component library, tối ưu ảnh/video và đo lường chuyển đổi với các biến thể A/B.',
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
                        { question: 'Gửi ví dụ dự án bạn tăng Core Web Vitals cho e-commerce hoặc booking.' },
                        { question: 'Bạn đề xuất quy trình QA cho các biến thể A/B ra sao?', isRequired: true }
                ]
        },
        {
                clientEmail: 'huong.pham@client.test',
                specialtyId: 'specialty_machine_learning',
                title: 'Dashboard dự báo sinh học từ dữ liệu lab IoT',
                description:
                        'Thu thập dữ liệu cảm biến từ thiết bị lab, chuẩn hóa pipeline và dựng mô hình dự báo bất thường. Cần dashboard realtime, cảnh báo và khả năng xuất báo cáo cho nhà khoa học không chuyên kỹ thuật.',
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
                        { question: 'Bạn từng xử lý dữ liệu cảm biến có noise/bị mất gói như thế nào?' },
                        { question: 'Trình bày cách bạn vận hành mô hình ML với cảnh báo drift.', isRequired: true }
                ]
        },
        {
                clientEmail: 'sylvia.chen@client.test',
                specialtyId: 'specialty_cloud_architecture',
                title: 'Tối ưu OMS, tích hợp kho & logistics cho chuỗi bán lẻ SEA',
                description:
                        'Thiết kế kiến trúc OMS đa vùng cho các quốc gia SEA, cần đồng bộ tồn kho gần thời gian thực và tích hợp hãng vận chuyển. Yêu cầu high availability, giám sát SLA và hỗ trợ đợt flash sale.',
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
                        { question: 'Kinh nghiệm của bạn với multi-region active-active hoặc active-passive?' },
                        { question: 'Bạn thiết kế kiến trúc scaling mùa sale như thế nào?', isRequired: true }
                ],
                customTerms: { requiresOnsite: true, onsiteCity: 'Singapore', preferredVendors: ['AWS', 'Cloudflare'] }
        },
        {
                clientEmail: 'diep.le@client.test',
                specialtyId: 'specialty_uiux',
                title: 'Thiết kế trải nghiệm booking homestay cao cấp',
                description:
                        'Cần flow đặt phòng nhiều bước, chọn add-on dịch vụ, lịch check-in linh hoạt và truyền thông thương hiệu xanh. Sản phẩm hướng tới khách quốc tế nên cần thiết kế song ngữ, accessible và có design system sẵn.',
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
                        { question: 'Gửi mẫu prototype high-fidelity gần đây bạn thực hiện.' },
                        { question: 'Bạn sẽ thu thập insight khách du lịch quốc tế như thế nào?' }
                ]
        },
        {
                clientEmail: 'paulina.rivera@client.test',
                specialtyId: 'specialty_cross_platform_mobile',
                title: 'Xây app marketplace đặc sản Latin America',
                description:
                        'Xây ứng dụng mua bán đặc sản bản địa, hỗ trợ đa ngôn ngữ, thanh toán nội địa và loyalty. Cần trải nghiệm offline-friendly, push notification cá nhân hóa và tích hợp CMS để quản lý nội dung.',
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
                        { question: 'Bạn tích hợp và kiểm thử thanh toán nội địa (Pix/Stripe/etc.) như thế nào?' },
                        { question: 'Chia sẻ kinh nghiệm làm push notification segment hóa người dùng.' }
                ]
        },
        {
                clientEmail: 'noah.wilson@client.test',
                specialtyId: 'specialty_security_operations',
                title: 'Xây dựng backend tuân thủ HIPAA cho app chăm sóc hậu phẫu',
                description:
                        'Nền tảng mobile/web cho bệnh nhân sau phẫu thuật, cần nhắc lịch dùng thuốc, chat với bác sĩ và lưu trữ dữ liệu y tế an toàn. Yêu cầu audit trail, mã hóa dữ liệu, phân quyền chi tiết và cảnh báo bất thường.',
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
                        { question: 'Bạn từng triển khai chuẩn HIPAA/GDPR cho hệ thống healthcare nào?' },
                        { question: 'Cách bạn xử lý sự cố khi phát hiện truy cập bất thường tới dữ liệu y tế?' }
                ],
                customTerms: { compliance: ['HIPAA'], dataResidency: 'US', securityReview: true }
        },
        {
                clientEmail: 'fatima.khan@client.test',
                specialtyId: 'specialty_data_engineering',
                title: 'Pipeline dữ liệu dự báo tưới tiêu thông minh',
                description:
                        'Thu thập dữ liệu khí hậu, vệ tinh và cảm biến nông nghiệp để đưa khuyến nghị tưới tiêu tự động. Cần pipeline tin cậy, data quality check, lưu trữ lịch sử và API cho nhóm khoa học dữ liệu.',
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
                        { question: 'Bạn bảo đảm chất lượng dữ liệu streaming như thế nào?' },
                        { question: 'Hãy mô tả thiết kế data contract giữa pipeline và team ML.', isRequired: true }
                ]
        },
        {
                clientEmail: 'maria.rossi@client.test',
                specialtyId: 'specialty_unity_dev',
                title: 'Lookbook AR và hệ thống đặt lịch fitting cho boutique thời trang',
                description:
                        'Ứng dụng AR thử đồ ảo, đồng bộ catalog sản phẩm và đặt lịch fitting tại store. Cần tracking chuyển đổi, chia sẻ social, hỗ trợ nhiều thiết bị iOS/Android và panel quản trị nội dung.',
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
                        { question: 'Bạn từng tối ưu hiệu năng AR trên thiết bị mid-tier như thế nào?' },
                        { question: 'Kinh nghiệm của bạn trong việc kết nối app AR với CMS/backoffice?' }
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
