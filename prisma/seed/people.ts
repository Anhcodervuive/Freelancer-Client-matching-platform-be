import bcrypt from 'bcrypt'
import { CompanySize, LanguageProficiency, Prisma, Role } from '../../src/generated/prisma'
import { prisma, runStep } from './_utils'

type ClientSeed = {
        email: string
        firstName: string
        lastName: string
        phoneNumber?: string
        country?: string
        city?: string
        district?: string
        address?: string
        companyName?: string
        websiteUrl?: string
        size?: CompanySize
        description?: string
}

type LanguageSeed = {
        code: string
        proficiency: LanguageProficiency
}

type EducationSeed = {
        schoolName: string
        degreeTitle: string
        fieldOfStudy?: string
        startYear?: number
        endYear?: number
}

type FreelancerSeed = {
        email: string
        firstName: string
        lastName: string
        phoneNumber?: string
        country?: string
        city?: string
        district?: string
        address?: string
        title: string
        bio: string
        links?: string[]
        categories: string[]
        specialties: string[]
        skills: string[]
        languages: LanguageSeed[]
        educations: EducationSeed[]
}

const TEST_PASSWORD_HASH = bcrypt.hashSync('TestPassword!123', 10)
const VERIFIED_AT = new Date('2024-01-15T00:00:00.000Z')
const SKIP_EXISTING_USERS = (process.env.SEED_SKIP_EXISTING_USERS ?? '').toLowerCase() === 'true'

const BASE_CLIENTS: ClientSeed[] = [
        {
                email: 'linh.tran@client.test',
                firstName: 'Linh',
                lastName: 'Trần',
                phoneNumber: '+84-937-555-201',
                country: 'Vietnam',
                city: 'Ho Chi Minh City',
                district: 'District 1',
                address: '21 Nguyễn Huệ',
                companyName: 'Saigon Fintech Hub',
                websiteUrl: 'https://saigonfintech.example.com',
                size: CompanySize.TEN_TO_NINETY,
                description: 'Fintech innovation lab investing in MVPs and bridging to traditional banks.'
        },
        {
                email: 'minh.nguyen@client.test',
                firstName: 'Minh',
                lastName: 'Nguyễn',
                phoneNumber: '+84-94-700-8020',
                country: 'Vietnam',
                city: 'Da Nang',
                district: 'Hai Chau',
                address: '18 Bạch Đằng',
                companyName: 'Central Travel Co',
                websiteUrl: 'https://centraltravel.example.com',
                size: CompanySize.TWO_TO_NINE,
                description: 'Central Vietnam tour-booking startup needing a conversion-focused web/mobile platform.'
        },
        {
                email: 'huong.pham@client.test',
                firstName: 'Hương',
                lastName: 'Phạm',
                phoneNumber: '+1-415-555-7622',
                country: 'USA',
                city: 'San Francisco',
                district: 'SOMA',
                address: '795 Folsom St',
                companyName: 'Bay Area BioAnalytics',
                websiteUrl: 'https://bioanalytics.example.com',
                size: CompanySize.JUST_ME,
                description: 'Bio-analytics consultant needing a data dashboard that ingests IoT lab devices.'
        },
        {
                email: 'sylvia.chen@client.test',
                firstName: 'Sylvia',
                lastName: 'Chen',
                phoneNumber: '+65-8123-9900',
                country: 'Singapore',
                city: 'Singapore',
                district: 'Tanjong Pagar',
                address: '80 Anson Rd',
                companyName: 'Marina Retail Collective',
                websiteUrl: 'https://marinaretail.example.com',
                size: CompanySize.HUNDRED_TO_K,
                description: 'SEA retail chain looking to optimize OMS and integrate warehouses and logistics.'
        },
        {
                email: 'diep.le@client.test',
                firstName: 'Diệp',
                lastName: 'Lê',
                phoneNumber: '+84-90-234-9991',
                country: 'Vietnam',
                city: 'Hanoi',
                district: 'Ba Dinh',
                address: '12 Kim Mã',
                companyName: 'GreenRoof Studio',
                websiteUrl: 'https://greenroof.example.com',
                size: CompanySize.TWO_TO_NINE,
                description: 'Green architecture studio wanting a 3D landing page to showcase concepts.'
        },
        {
                email: 'andrew.taylor@client.test',
                firstName: 'Andrew',
                lastName: 'Taylor',
                phoneNumber: '+44-7700-900-201',
                country: 'UK',
                city: 'London',
                district: 'Shoreditch',
                address: '25 Great Eastern St',
                companyName: 'InsightOps Advisory',
                websiteUrl: 'https://insightops.example.com',
                size: CompanySize.TEN_TO_NINETY,
                description: 'Data governance consultancy seeking an internal BI portal and self-serve analytics.'
        },
        {
                email: 'paulina.rivera@client.test',
                firstName: 'Paulina',
                lastName: 'Rivera',
                phoneNumber: '+52-55-8010-2222',
                country: 'Mexico',
                city: 'CDMX',
                district: 'Roma Norte',
                address: '109 Calle Colima',
                companyName: 'Mercado Urbano',
                websiteUrl: 'https://mercadourbano.example.com',
                size: CompanySize.TWO_TO_NINE,
                description: 'Latin American specialty marketplace that needs a better mobile experience.'
        },
        {
                email: 'noah.wilson@client.test',
                firstName: 'Noah',
                lastName: 'Wilson',
                phoneNumber: '+61-412-889-300',
                country: 'Australia',
                city: 'Sydney',
                district: 'Surry Hills',
                address: '44 Devonshire St',
                companyName: 'Coastal HealthTech',
                websiteUrl: 'https://coastalhealth.example.com',
                size: CompanySize.MORE_THAN_K,
                description: 'Healthcare group rolling out a post-op care app that needs a HIPAA-ready backend.'
        },
        {
                email: 'fatima.khan@client.test',
                firstName: 'Fatima',
                lastName: 'Khan',
                phoneNumber: '+971-50-123-8820',
                country: 'UAE',
                city: 'Dubai',
                district: 'Business Bay',
                address: '24 Marasi Dr',
                companyName: 'Desert Bloom Labs',
                websiteUrl: 'https://desertbloom.example.com',
                size: CompanySize.JUST_ME,
                description: 'Climate-AI founder prototyping smart irrigation forecasting models.'
        },
        {
                email: 'maria.rossi@client.test',
                firstName: 'Maria',
                lastName: 'Rossi',
                phoneNumber: '+39-349-770-9988',
                country: 'Italy',
                city: 'Milan',
                district: 'Brera',
                address: '7 Via Brera',
                companyName: 'Atelier Moda',
                websiteUrl: 'https://ateliermoda.example.com',
                size: CompanySize.TWO_TO_NINE,
                description: 'Boutique fashion house wants an AR lookbook and appointment booking system.'
        }
]

function generateClients(count: number): ClientSeed[] {
        return Array.from({ length: count }, (_, index) => {
                const idx = index + 1
                return {
                        email: `ml.client${idx}@client.test`,
                        firstName: `Client${idx}`,
                        lastName: 'Data',
                        phoneNumber: `+84-90-000-${String(1000 + idx).slice(-4)}`,
                        country: 'Vietnam',
                        city: 'Ho Chi Minh City',
                        district: 'District 3',
                        address: `${10 + idx} Trần Quang Khải`,
                        companyName: `Dataset Labs ${idx}`,
                        websiteUrl: `https://dataset-labs-${idx}.example.com`,
                        size: CompanySize.TEN_TO_NINETY,
                        description: 'Synthetic hiring client for ML interaction seeding.'
                }
        })
}

const CLIENTS: ClientSeed[] = [...BASE_CLIENTS, ...generateClients(25)]

const BASE_FREELANCERS: FreelancerSeed[] = [
        {
                email: 'amira.nguyen@freelancer.test',
                firstName: 'Amira',
                lastName: 'Nguyễn',
                phoneNumber: '+84-91-123-4001',
                country: 'Vietnam',
                city: 'Ho Chi Minh City',
                district: 'Binh Thanh',
                address: '220 Phan Xich Long',
                title: 'Full-stack TypeScript Engineer',
                bio: 'Builds Node.js/NestJS microservices and high-performance Next.js frontends, previously scaling systems to 2M MAU. Prefers event-driven architecture, full logging/observability, and CI/CD with contract testing to ship weekly releases.',
                links: ['https://github.com/amira-dev', 'https://amira.dev'],
                categories: ['category_web_dev'],
                specialties: ['specialty_fullstack_dev', 'specialty_backend_dev'],
                skills: ['skill_typescript', 'skill_nodejs', 'skill_graphql', 'skill_postgresql', 'skill_docker'],
                languages: [
                        { code: 'vi', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'HCMUT', degreeTitle: 'BSc Computer Science', fieldOfStudy: 'Software Engineering', startYear: 2013, endYear: 2017 }
                ]
        },
        {
                email: 'kaito.ito@freelancer.test',
                firstName: 'Kaito',
                lastName: 'Ito',
                phoneNumber: '+81-80-2001-1222',
                country: 'Japan',
                city: 'Tokyo',
                district: 'Shibuya',
                address: '2-24-12 Shibuya',
                title: 'Frontend Engineer (React/Accessibility)',
                bio: 'Designs accessible React UI components and optimizes Core Web Vitals for B2B SaaS and e-commerce. Performs WCAG audits, builds design tokens/Storybook, and partners with QA to safeguard experience quality.',
                links: ['https://dribbble.com/kaitoito', 'https://github.com/kaito-frontend'],
                categories: ['category_web_dev'],
                specialties: ['specialty_frontend_dev'],
                skills: ['skill_react', 'skill_nextjs', 'skill_tailwind', 'skill_html', 'skill_css'],
                languages: [
                        { code: 'ja', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                educations: [
                        { schoolName: 'Waseda University', degreeTitle: 'BEng Information & Communication', startYear: 2012, endYear: 2016 }
                ]
        },
        {
                email: 'sofia.lima@freelancer.test',
                firstName: 'Sofia',
                lastName: 'Lima',
                phoneNumber: '+55-11-90002-9002',
                country: 'Brazil',
                city: 'São Paulo',
                district: 'Pinheiros',
                address: '180 Rua dos Pinheiros',
                title: 'Mobile Engineer (Flutter)',
                bio: 'Five years building fintech and logistics super-apps with Flutter, mobile CI/CD, and animation performance tuning. Skilled in offline-first patterns, reducing build size, tracking crashes/analytics, and shipping to multiple app stores.',
                links: ['https://sofia.codes', 'https://github.com/sofialima'],
                categories: ['category_mobile_dev'],
                specialties: ['specialty_cross_platform_mobile'],
                skills: ['skill_flutter', 'skill_react', 'skill_graphql', 'skill_rest_api', 'skill_ci_cd'],
                languages: [
                        { code: 'pt', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT },
                        { code: 'es', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                educations: [
                        { schoolName: 'USP', degreeTitle: 'BSc Information Systems', startYear: 2011, endYear: 2015 }
                ]
        },
        {
                email: 'aditya.raj@freelancer.test',
                firstName: 'Aditya',
                lastName: 'Raj',
                phoneNumber: '+91-98100-5566',
                country: 'India',
                city: 'Bengaluru',
                district: 'Indiranagar',
                address: '12 12th Main Rd',
                title: 'Cloud Architect & DevOps',
                bio: 'Architects AWS multi-account environments with Terraform IaC, cost optimization, and SRE practices for fast-scaling products. Builds security guardrails, blue/green deployment blueprints, and FinOps dashboards to control budgets.',
                links: ['https://www.linkedin.com/in/aditya-raj', 'https://github.com/aditya-ops'],
                categories: ['category_cloud_devops'],
                specialties: ['specialty_cloud_architecture', 'specialty_container_platforms'],
                skills: ['skill_aws', 'skill_kubernetes', 'skill_terraform', 'skill_docker', 'skill_observability'],
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.FLUENT },
                        { code: 'hi', proficiency: LanguageProficiency.NATIVE }
                ],
                educations: [
                        { schoolName: 'IIT Delhi', degreeTitle: 'BTech Computer Science', startYear: 2010, endYear: 2014 }
                ]
        },
        {
                email: 'elena.garcia@freelancer.test',
                firstName: 'Elena',
                lastName: 'Garcia',
                phoneNumber: '+34-600-222-777',
                country: 'Spain',
                city: 'Barcelona',
                district: 'Eixample',
                address: '45 Carrer de Girona',
                title: 'Data Scientist (Product Analytics)',
                bio: 'Builds event-data pipelines, propensity/retention models, and insight visualizations for product-led growth. Designs normalized ETL flows, A/B tracking, and hands off dashboards to PM and marketing teams.',
                links: ['https://elena-data.example.com'],
                categories: ['category_data'],
                specialties: ['specialty_analytics'],
                skills: ['skill_python', 'skill_pandas', 'skill_scikit', 'skill_airflow', 'skill_tableau'],
                languages: [
                        { code: 'es', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT },
                        { code: 'ca', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                educations: [
                        { schoolName: 'UPC Barcelona', degreeTitle: 'MSc Data Science', startYear: 2015, endYear: 2017 }
                ]
        },
        {
                email: 'liam.brown@freelancer.test',
                firstName: 'Liam',
                lastName: 'Brown',
                phoneNumber: '+1-206-555-1188',
                country: 'USA',
                city: 'Seattle',
                district: 'Capitol Hill',
                address: '1423 Pike St',
                title: 'Machine Learning Engineer',
                bio: 'Deploys recommender and NLP models on GCP while optimizing inference latency and MLOps CI/CD. Sets up feature stores, monitors drift, runs canary rollouts, and measures impact on retention and revenue.',
                links: ['https://liambrown.ai', 'https://github.com/liam-ml'],
                categories: ['category_data'],
                specialties: ['specialty_ml_engineering'],
                skills: ['skill_python', 'skill_pytorch', 'skill_tensorflow', 'skill_gcp', 'skill_data_engineering'],
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.NATIVE }
                ],
                educations: [
                        { schoolName: 'University of Washington', degreeTitle: 'MS Computer Science', fieldOfStudy: 'ML', startYear: 2014, endYear: 2016 }
                ]
        },
        {
                email: 'hana.le@freelancer.test',
                firstName: 'Hà',
                lastName: 'Lê',
                phoneNumber: '+84-98-866-4411',
                country: 'Vietnam',
                city: 'Hanoi',
                district: 'Cau Giay',
                address: '99 Duy Tan',
                title: 'Product Designer (UX/UI)',
                bio: 'Leads discovery, wireframes, and high-fidelity prototypes in Figma while standing up multi-product design systems. Runs recurring usability tests, measures component adoption, and mentors engineers on consistent token usage.',
                links: ['https://www.behance.net/hanale', 'https://dribbble.com/hanale'],
                categories: ['category_design'],
                specialties: ['specialty_uiux', 'specialty_design_systems'],
                skills: ['skill_figma', 'skill_design_systems', 'skill_ux_research', 'skill_adobexd', 'skill_illustrator'],
                languages: [
                        { code: 'vi', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'NEU', degreeTitle: 'BA Marketing', startYear: 2011, endYear: 2015 }
                ]
        },
        {
                email: 'mohamed.ahmed@freelancer.test',
                firstName: 'Mohamed',
                lastName: 'Ahmed',
                phoneNumber: '+20-100-889-7000',
                country: 'Egypt',
                city: 'Cairo',
                district: 'New Cairo',
                address: '34 North 90th St',
                title: 'Security Consultant',
                bio: 'Performs web and mobile penetration testing, hardens cloud infrastructure, and establishes incident response playbooks. Executes red teaming, reviews IaC misconfigurations, and trains teams on secure SDLC.',
                links: ['https://securitynotes.blog/mohamed'],
                categories: ['category_cybersecurity'],
                specialties: ['specialty_pen_test', 'specialty_security_operations'],
                skills: ['skill_pen_testing', 'skill_network_security', 'skill_incident_response', 'skill_application_security', 'skill_security_compliance'],
                languages: [
                        { code: 'ar', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'Cairo University', degreeTitle: 'BSc Information Security', startYear: 2009, endYear: 2013 }
                ]
        },
        {
                email: 'giulia.bianchi@freelancer.test',
                firstName: 'Giulia',
                lastName: 'Bianchi',
                phoneNumber: '+39-347-220-1444',
                country: 'Italy',
                city: 'Turin',
                district: 'Centro',
                address: '12 Via Roma',
                title: 'QA Engineer (Automation)',
                bio: 'Writes E2E scripts with Playwright/Cypress, integrates CI pipelines, and builds shift-left testing strategies. Sets up test data services, measures critical-path coverage, and shortens feedback loops for developers.',
                links: ['https://github.com/giuliabianchi'],
                categories: ['category_quality_assurance'],
                specialties: ['specialty_test_automation', 'specialty_api_testing'],
                skills: ['skill_playwright', 'skill_cypress', 'skill_api_testing', 'skill_jest', 'skill_ci_cd'],
                languages: [
                        { code: 'it', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'Politecnico di Torino', degreeTitle: 'MEng Computer Engineering', startYear: 2013, endYear: 2015 }
                ]
        },
        {
                email: 'charles.dubois@freelancer.test',
                firstName: 'Charles',
                lastName: 'Dubois',
                phoneNumber: '+33-6-22-55-7766',
                country: 'France',
                city: 'Paris',
                district: 'Le Marais',
                address: '8 Rue des Francs Bourgeois',
                title: 'Backend Engineer (Go/Java)',
                bio: 'Designs high-performance APIs with Go and Spring Boot, optimizing caching and observability for marketplace systems. Practices CQRS/hexagonal architecture, profiles queries, and standardizes SLO dashboards for stable operations.',
                links: ['https://charles.dev'],
                categories: ['category_web_dev'],
                specialties: ['specialty_backend_dev'],
                skills: ['skill_golang', 'skill_java', 'skill_spring', 'skill_redis', 'skill_postgresql'],
                languages: [
                        { code: 'fr', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'INSA Lyon', degreeTitle: 'MEng Software Engineering', startYear: 2010, endYear: 2015 }
                ]
        },
        {
                email: 'lena.morris@freelancer.test',
                firstName: 'Lena',
                lastName: 'Morris',
                phoneNumber: '+1-347-555-8899',
                country: 'USA',
                city: 'New York',
                district: 'Brooklyn',
                address: '210 Bedford Ave',
                title: 'Content UX Writer',
                bio: 'Crafts product content, microcopy, onboarding flows, and A/B tests that retain users. Combines UX research, persona segmentation, and voice/tone optimization to reduce drop-offs across funnels.',
                links: ['https://lenawrites.com'],
                categories: ['category_design'],
                specialties: ['specialty_product_strategy', 'specialty_ux_research'],
                skills: ['skill_product_discovery', 'skill_ux_research', 'skill_figma', 'skill_design_systems', 'skill_jest'],
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.NATIVE },
                        { code: 'es', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                educations: [
                        { schoolName: 'NYU', degreeTitle: 'BA Journalism', startYear: 2009, endYear: 2013 }
                ]
        },
        {
                email: 'pawel.nowak@freelancer.test',
                firstName: 'Paweł',
                lastName: 'Nowak',
                phoneNumber: '+48-601-339-220',
                country: 'Poland',
                city: 'Kraków',
                district: 'Kazimierz',
                address: '5 Miodowa',
                title: 'Site Reliability Engineer',
                bio: 'Sets up observability stacks, autoscaling Kubernetes, and chaos testing to uphold 99.9% SLOs. Authors runbooks, reduces MTTR with standardized alerts, and tunes capacity planning for seasonal traffic.',
                links: ['https://github.com/pnowak-sre'],
                categories: ['category_cloud_devops'],
                specialties: ['specialty_site_reliability'],
                skills: ['skill_kubernetes', 'skill_observability', 'skill_linux', 'skill_ci_cd', 'skill_terraform'],
                languages: [
                        { code: 'pl', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'AGH University', degreeTitle: 'MSc Computer Science', startYear: 2011, endYear: 2016 }
                ]
        },
        {
                email: 'sofia.markovic@freelancer.test',
                firstName: 'Sofija',
                lastName: 'Marković',
                phoneNumber: '+381-63-200-889',
                country: 'Serbia',
                city: 'Belgrade',
                district: 'Dorćol',
                address: '17 Cara Dušana',
                title: 'Android Engineer',
                bio: 'Builds native Kotlin apps with Jetpack Compose, optimizes offline-first behavior, and strengthens testing pipelines. Improves startup time, modularizes features, links CI for beta distribution, and tracks crash-free rates continuously.',
                links: ['https://github.com/sofia-android'],
                categories: ['category_mobile_dev'],
                specialties: ['specialty_native_android'],
                skills: ['skill_kotlin', 'skill_android', 'skill_java', 'skill_rest_api', 'skill_test_automation'],
                languages: [
                        { code: 'sr', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'University of Belgrade', degreeTitle: 'BSc Electrical Engineering', startYear: 2012, endYear: 2016 }
                ]
        },
        {
                email: 'emily.wong@freelancer.test',
                firstName: 'Emily',
                lastName: 'Wong',
                phoneNumber: '+852-9012-3334',
                country: 'Hong Kong',
                city: 'Hong Kong',
                district: 'Kowloon',
                address: '88 Nathan Rd',
                title: 'iOS Engineer',
                bio: 'Develops SwiftUI apps with Apple Pay/TestFlight integrations, optimizing battery life and accessibility. Uses Combine/async-await, designs Clean architecture, and monitors performance through Xcode Metrics.',
                links: ['https://emilywong.dev'],
                categories: ['category_mobile_dev'],
                specialties: ['specialty_native_ios'],
                skills: ['skill_swift', 'skill_ios', 'skill_rest_api', 'skill_ci_cd', 'skill_manual_testing'],
                languages: [
                        { code: 'zh', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'HKUST', degreeTitle: 'BEng Computer Engineering', startYear: 2011, endYear: 2015 }
                ]
        },
        {
                email: 'nina.schmidt@freelancer.test',
                firstName: 'Nina',
                lastName: 'Schmidt',
                phoneNumber: '+49-160-440-9900',
                country: 'Germany',
                city: 'Berlin',
                district: 'Prenzlauer Berg',
                address: '22 Kastanienallee',
                title: 'Data Engineer',
                bio: 'Builds data lakehouses with dbt plus Airflow and CDC pipelines while enforcing data quality and governance. Establishes data contracts, lineage catalogs, and quality alerts to support downstream BI/ML.',
                links: ['https://github.com/ninaschmidt'],
                categories: ['category_data'],
                specialties: ['specialty_data_engineering'],
                skills: ['skill_data_engineering', 'skill_airflow', 'skill_postgresql', 'skill_python', 'skill_sql'],
                languages: [
                        { code: 'de', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'TU Berlin', degreeTitle: 'MSc Computer Science', startYear: 2013, endYear: 2015 }
                ]
        },
        {
                email: 'andres.gutierrez@freelancer.test',
                firstName: 'Andrés',
                lastName: 'Gutiérrez',
                phoneNumber: '+57-310-221-9988',
                country: 'Colombia',
                city: 'Medellín',
                district: 'El Poblado',
                address: '56 Calle 10',
                title: 'Game Developer (Unity)',
                bio: 'Creates gameplay loops, in-game economies, and performance optimizations in Unity for mobile and VR titles. Reduces draw calls and batching, designs live-ops systems, and deploys analytics to balance monetization.',
                links: ['https://andresgames.dev'],
                categories: ['category_game_dev'],
                specialties: ['specialty_unity_dev'],
                skills: ['skill_unity', 'skill_csharp', 'skill_cpp', 'skill_blender', 'skill_graphql'],
                languages: [
                        { code: 'es', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                educations: [
                        { schoolName: 'EAFIT University', degreeTitle: 'BSc Digital Entertainment', startYear: 2010, endYear: 2014 }
                ]
        },
        {
                email: 'sara.ali@freelancer.test',
                firstName: 'Sara',
                lastName: 'Ali',
                phoneNumber: '+974-5555-1010',
                country: 'Qatar',
                city: 'Doha',
                district: 'West Bay',
                address: '14 Diplomatic St',
                title: 'Quality Analyst (Performance)',
                bio: 'Designs JMeter/k6 load tests, analyzes backend bottlenecks, and optimizes queries and databases. Establishes SLA baselines, simulates region-based traffic, and provides guidance to optimize code and infrastructure.',
                links: ['https://sara.qa/performance'],
                categories: ['category_quality_assurance'],
                specialties: ['specialty_performance_testing'],
                skills: ['skill_performance_testing', 'skill_postman', 'skill_rest_api', 'skill_sql', 'skill_observability'],
                languages: [
                        { code: 'ar', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'Qatar University', degreeTitle: 'BSc Computer Science', startYear: 2012, endYear: 2016 }
                ]
        },
        {
                email: 'daniel.choi@freelancer.test',
                firstName: 'Daniel',
                lastName: 'Choi',
                phoneNumber: '+82-10-8888-7770',
                country: 'South Korea',
                city: 'Seoul',
                district: 'Gangnam',
                address: '321 Teheran-ro',
                title: 'Full-stack JS (Realtime)',
                bio: 'Delivers realtime chat and video streaming with WebRTC/Socket.IO while hardening security and interactivity. Tunes signaling via TURN/ICE, protects routes with rate limiting and JWT, and monitors end-to-end latency.',
                links: ['https://danielchoi.dev'],
                categories: ['category_web_dev'],
                specialties: ['specialty_fullstack_dev'],
                skills: ['skill_nodejs', 'skill_typescript', 'skill_react', 'skill_graphql', 'skill_redis'],
                languages: [
                        { code: 'ko', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'KAIST', degreeTitle: 'BSc Computer Science', startYear: 2010, endYear: 2014 }
                ]
        },
        {
                email: 'leah.mendes@freelancer.test',
                firstName: 'Leah',
                lastName: 'Mendes',
                phoneNumber: '+27-82-880-4411',
                country: 'South Africa',
                city: 'Cape Town',
                district: 'Gardens',
                address: '78 Kloof St',
                title: 'UX Researcher',
                bio: 'Conducts user interviews, field studies, and journey mapping while prioritizing backlogs from qualitative insights. Builds research repositories, aligns stakeholders, and turns findings into clear experiment KPIs.',
                links: ['https://leahresearch.com'],
                categories: ['category_design'],
                specialties: ['specialty_ux_research'],
                skills: ['skill_ux_research', 'skill_product_discovery', 'skill_figma', 'skill_design_systems', 'skill_manual_testing'],
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.NATIVE },
                        { code: 'af', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                educations: [
                        { schoolName: 'UCT', degreeTitle: 'BA Psychology', startYear: 2011, endYear: 2014 }
                ]
        },
        {
                email: 'mateo.santana@freelancer.test',
                firstName: 'Mateo',
                lastName: 'Santana',
                phoneNumber: '+34-690-100-888',
                country: 'Spain',
                city: 'Madrid',
                district: 'Chamartín',
                address: '9 Calle de Serrano',
                title: 'DevOps for Mobile',
                bio: 'Sets up mobile CI/CD with Bitrise/Fastlane, automated testing, and multi-market beta distribution. Standardizes app signing, manages multi-environment configuration, and tracks quality gates before release.',
                links: ['https://mateodevops.io'],
                categories: ['category_mobile_dev'],
                specialties: ['specialty_mobile_devops'],
                skills: ['skill_ci_cd', 'skill_test_automation', 'skill_git', 'skill_manual_testing', 'skill_rest_api'],
                languages: [
                        { code: 'es', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'UC3M', degreeTitle: 'BSc Telematics', startYear: 2011, endYear: 2015 }
                ]
        },
        {
                email: 'ivy.tan@freelancer.test',
                firstName: 'Ivy',
                lastName: 'Tan',
                phoneNumber: '+60-12-889-7722',
                country: 'Malaysia',
                city: 'Kuala Lumpur',
                district: 'Bangsar',
                address: '1 Jalan Telawi',
                title: 'Front-end Vue Engineer',
                bio: 'Builds B2B dashboards with Vue/Nuxt, optimizing performance, state management, and robust unit tests. Crafts modular architectures, tests components and stories, and improves first-load time through SSR.',
                links: ['https://github.com/ivytan'],
                categories: ['category_web_dev'],
                specialties: ['specialty_frontend_dev'],
                skills: ['skill_vue', 'skill_typescript', 'skill_tailwind', 'skill_rest_api', 'skill_jest'],
                languages: [
                        { code: 'ms', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT },
                        { code: 'zh', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                educations: [
                        { schoolName: 'Monash University Malaysia', degreeTitle: 'BSc Computer Science', startYear: 2012, endYear: 2016 }
                ]
        },
        {
                email: 'farid.haddad@freelancer.test',
                firstName: 'Farid',
                lastName: 'Haddad',
                phoneNumber: '+962-7-7770-4411',
                country: 'Jordan',
                city: 'Amman',
                district: 'Abdali',
                address: '19 Al Shmeisani',
                title: 'Cybersecurity Governance',
                bio: 'Assesses ISO 27001 compliance, establishes policies, delivers security training, and plans remediation roadmaps. Performs risk assessments, designs control metrics, and guides development teams on secure baselines.',
                links: ['https://faridsec.com'],
                categories: ['category_cybersecurity'],
                specialties: ['specialty_security_governance'],
                skills: ['skill_security_compliance', 'skill_security_governance', 'skill_incident_response', 'skill_network_security', 'skill_application_security'],
                languages: [
                        { code: 'ar', proficiency: LanguageProficiency.NATIVE },
                        { code: 'en', proficiency: LanguageProficiency.FLUENT }
                ],
                educations: [
                        { schoolName: 'University of Jordan', degreeTitle: 'BSc Information Systems', startYear: 2008, endYear: 2012 }
                ]
        },
        {
                email: 'mia.hernandez@freelancer.test',
                firstName: 'Mia',
                lastName: 'Hernandez',
                phoneNumber: '+1-415-500-2201',
                country: 'USA',
                city: 'San Francisco',
                district: 'Mission',
                address: '400 Valencia St',
                title: 'Full-stack Ruby/JS',
                bio: 'Refactors Rails monoliths, splits Node services, builds GraphQL gateways, and improves developer experience with CI/CD. Plans gradual migrations, adds contract tests, and standardizes logging to speed up debugging.',
                links: ['https://mia.codes'],
                categories: ['category_web_dev'],
                specialties: ['specialty_fullstack_dev'],
                skills: ['skill_graphql', 'skill_rest_api', 'skill_javascript', 'skill_react', 'skill_docker'],
                languages: [
                        { code: 'en', proficiency: LanguageProficiency.NATIVE },
                        { code: 'es', proficiency: LanguageProficiency.CONVERSATIONAL }
                ],
                educations: [
                        { schoolName: 'UC Berkeley', degreeTitle: 'BS Computer Science', startYear: 2008, endYear: 2012 }
                ]
        }
]

function generateFreelancers(count: number): FreelancerSeed[] {
        return Array.from({ length: count }, (_, index) => {
                const idx = index + 1
                const baseSkill = idx % 3 === 0 ? 'skill_react' : idx % 3 === 1 ? 'skill_python' : 'skill_typescript'
                const baseSpecialty = idx % 3 === 0 ? 'specialty_frontend_dev' : idx % 3 === 1 ? 'specialty_machine_learning' : 'specialty_fullstack_dev'

                return {
                        email: `ml.freelancer${idx}@freelancer.test`,
                        firstName: `Freelancer${idx}`,
                        lastName: 'ML',
                        phoneNumber: `+84-91-555-${String(2000 + idx).slice(-4)}`,
                        country: 'Vietnam',
                        city: 'Ho Chi Minh City',
                        district: 'District 10',
                        address: `${50 + idx} Le Hong Phong`,
                        title: `Product builder ${idx}`,
                        bio: 'Ships production features with metrics instrumentation and interview-friendly collaboration.',
                        links: [`https://portfolio-${idx}.example.com`],
                        categories: ['category_web_dev'],
                        specialties: [baseSpecialty],
                        skills: ['skill_nodejs', baseSkill, 'skill_sql'],
                        languages: [
                                { code: 'en', proficiency: LanguageProficiency.FLUENT },
                                { code: 'vi', proficiency: LanguageProficiency.NATIVE }
                        ],
                        educations: [
                                { schoolName: 'UIT HCM', degreeTitle: 'BSc Software Engineering', startYear: 2015, endYear: 2019 }
                        ]
                }
        })
}

const FREELANCERS: FreelancerSeed[] = [
        ...BASE_FREELANCERS,
        ...generateFreelancers(Math.max(0, 70 - BASE_FREELANCERS.length))
]

export async function seedPeople() {
        const [categories, specialties, skills] = await Promise.all([
                prisma.category.findMany({ select: { id: true } }),
                prisma.specialty.findMany({ select: { id: true } }),
                prisma.skill.findMany({ select: { id: true } })
        ])

        const categoryIds = new Set(categories.map(c => c.id))
        const specialtyIds = new Set(specialties.map(s => s.id))
        const skillIds = new Set(skills.map(s => s.id))

        function filterExisting(ids: string[], validSet: Set<string>, label: string, owner: string) {
                const existing = ids.filter(id => validSet.has(id))
                const missing = ids.filter(id => !validSet.has(id))
                if (missing.length) {
                        console.warn(`⚠ Missing ${label} for ${owner}: ${missing.join(', ')}`)
                }
                return existing
        }

        await runStep('Seed clients', async () => {
                for (const client of CLIENTS) {
                        if (SKIP_EXISTING_USERS) {
                                const existing = await prisma.user.findUnique({ where: { email: client.email }, select: { id: true } })
                                if (existing) {
                                        console.log(`↷ Skip existing client ${client.email}`)
                                        continue
                                }
                        }

                        await prisma.user.upsert({
                                where: { email: client.email },
                                create: {
                                        email: client.email,
                                        password: TEST_PASSWORD_HASH,
                                        role: Role.CLIENT,
                                        emailVerifiedAt: VERIFIED_AT,
                                        isActive: true,
                                        profile: {
                                                create: {
                                                        firstName: client.firstName,
                                                        lastName: client.lastName,
                                                        phoneNumber: client.phoneNumber ?? null,
                                                        country: client.country ?? null,
                                                        city: client.city ?? null,
                                                        district: client.district ?? null,
                                                        address: client.address ?? null,
                                                        client: {
                                                                create: {
                                                                        companyName: client.companyName ?? null,
                                                                        websiteUrl: client.websiteUrl ?? null,
                                                                        size: client.size ?? null,
                                                                        description: client.description ?? null
                                                                }
                                                        }
                                                }
                                        }
                                },
                                update: {
                                        password: TEST_PASSWORD_HASH,
                                        role: Role.CLIENT,
                                        emailVerifiedAt: VERIFIED_AT,
                                        isActive: true,
                                        profile: {
                                                upsert: {
                                                        create: {
                                                                firstName: client.firstName,
                                                                lastName: client.lastName,
                                                                phoneNumber: client.phoneNumber ?? null,
                                                                country: client.country ?? null,
                                                                city: client.city ?? null,
                                                                district: client.district ?? null,
                                                                address: client.address ?? null,
                                                                client: {
                                                                        create: {
                                                                                companyName: client.companyName ?? null,
                                                                                websiteUrl: client.websiteUrl ?? null,
                                                                                size: client.size ?? null,
                                                                                description: client.description ?? null
                                                                        }
                                                                }
                                                        },
                                                        update: {
                                                                firstName: client.firstName,
                                                                lastName: client.lastName,
                                                                phoneNumber: client.phoneNumber ?? null,
                                                                country: client.country ?? null,
                                                                city: client.city ?? null,
                                                                district: client.district ?? null,
                                                                address: client.address ?? null,
                                                                client: {
                                                                        upsert: {
                                                                                create: {
                                                                                        companyName: client.companyName ?? null,
                                                                                        websiteUrl: client.websiteUrl ?? null,
                                                                                        size: client.size ?? null,
                                                                                        description: client.description ?? null
                                                                                },
                                                                                update: {
                                                                                        companyName: client.companyName ?? null,
                                                                                        websiteUrl: client.websiteUrl ?? null,
                                                                                        size: client.size ?? null,
                                                                                        description: client.description ?? null
                                                                                }
                                                                        }
                                                                }
                                                        }
                                                }
                                        }
                                }
                        })
                }
        })

        await runStep('Seed freelancers', async () => {
                for (const freelancer of FREELANCERS) {
                        if (SKIP_EXISTING_USERS) {
                                const existing = await prisma.user.findUnique({ where: { email: freelancer.email }, select: { id: true } })
                                if (existing) {
                                        console.log(`↷ Skip existing freelancer ${freelancer.email}`)
                                        continue
                                }
                        }

                        const allowedCategories = filterExisting(
                                freelancer.categories,
                                categoryIds,
                                'categories',
                                freelancer.email
                        )
                        const allowedSpecialties = filterExisting(
                                freelancer.specialties,
                                specialtyIds,
                                'specialties',
                                freelancer.email
                        )
                        const allowedSkills = filterExisting(
                                freelancer.skills,
                                skillIds,
                                'skills',
                                freelancer.email
                        )

                        const user = await prisma.user.upsert({
                                where: { email: freelancer.email },
                                create: {
                                        email: freelancer.email,
                                        password: TEST_PASSWORD_HASH,
                                        role: Role.FREELANCER,
                                        emailVerifiedAt: VERIFIED_AT,
                                        isActive: true,
                                        profile: {
                                                create: {
                                                        firstName: freelancer.firstName,
                                                        lastName: freelancer.lastName,
                                                        phoneNumber: freelancer.phoneNumber ?? null,
                                                        country: freelancer.country ?? null,
                                                        city: freelancer.city ?? null,
                                                        district: freelancer.district ?? null,
                                                        address: freelancer.address ?? null,
                                                        freelancer: {
                                                                create: {
                                                                        title: freelancer.title,
                                                                        bio: freelancer.bio,
                                                                        links: freelancer.links ?? Prisma.JsonNull
                                                                }
                                                        }
                                                }
                                        }
                                },
                                update: {
                                        password: TEST_PASSWORD_HASH,
                                        role: Role.FREELANCER,
                                        emailVerifiedAt: VERIFIED_AT,
                                        isActive: true,
                                        profile: {
                                                upsert: {
                                                        create: {
                                                                firstName: freelancer.firstName,
                                                                lastName: freelancer.lastName,
                                                                phoneNumber: freelancer.phoneNumber ?? null,
                                                                country: freelancer.country ?? null,
                                                                city: freelancer.city ?? null,
                                                                district: freelancer.district ?? null,
                                                                address: freelancer.address ?? null,
                                                                freelancer: {
                                                                        create: {
                                                                                title: freelancer.title,
                                                                                bio: freelancer.bio,
                                                                                links: freelancer.links ?? Prisma.JsonNull
                                                                        }
                                                                }
                                                        },
                                                        update: {
                                                                firstName: freelancer.firstName,
                                                                lastName: freelancer.lastName,
                                                                phoneNumber: freelancer.phoneNumber ?? null,
                                                                country: freelancer.country ?? null,
                                                                city: freelancer.city ?? null,
                                                                district: freelancer.district ?? null,
                                                                address: freelancer.address ?? null,
                                                                freelancer: {
                                                                        upsert: {
                                                                                create: {
                                                                                        title: freelancer.title,
                                                                                        bio: freelancer.bio,
                                                                                        links: freelancer.links ?? Prisma.JsonNull
                                                                                },
                                                                                update: {
                                                                                        title: freelancer.title,
                                                                                        bio: freelancer.bio,
                                                                                        links: freelancer.links ?? Prisma.JsonNull
                                                                                }
                                                                        }
                                                                }
                                                        }
                                                }
                                        }
                                }
                        })

                        await prisma.freelancerLanguage.deleteMany({ where: { freelancerId: user.id } })
                        if (freelancer.languages.length) {
                                await prisma.freelancerLanguage.createMany({
                                        data: freelancer.languages.map(lang => ({
                                                freelancerId: user.id,
                                                languageCode: lang.code,
                                                proficiency: lang.proficiency
                                        }))
                                })
                        }

                        await prisma.freelancerCategorySelection.deleteMany({ where: { userId: user.id } })
                        if (allowedCategories.length) {
                                await prisma.freelancerCategorySelection.createMany({
                                        data: allowedCategories.map(categoryId => ({
                                                userId: user.id,
                                                categoryId
                                        }))
                                })
                        }

                        await prisma.freelancerSpecialtySelection.deleteMany({ where: { userId: user.id } })
                        if (allowedSpecialties.length) {
                                await prisma.freelancerSpecialtySelection.createMany({
                                        data: allowedSpecialties.map(specialtyId => ({
                                                userId: user.id,
                                                specialtyId
                                        }))
                                })
                        }

                        await prisma.freelancerSkillSelection.deleteMany({ where: { userId: user.id } })
                        if (allowedSkills.length) {
                                await prisma.freelancerSkillSelection.createMany({
                                        data: allowedSkills.map((skillId, index) => ({
                                                userId: user.id,
                                                skillId,
                                                orderHint: index
                                        }))
                                })
                        }

                        await prisma.education.deleteMany({ where: { freelancerId: user.id } })
                        if (freelancer.educations.length) {
                                for (const edu of freelancer.educations) {
                                        await prisma.education.create({
                                                data: {
                                                        freelancerId: user.id,
                                                        schoolName: edu.schoolName,
                                                        degreeTitle: edu.degreeTitle,
                                                        fieldOfStudy: edu.fieldOfStudy ?? null,
                                                        startYear: edu.startYear ?? null,
                                                        endYear: edu.endYear ?? null
                                                }
                                        })
                                }
                        }
                }
        })
}
