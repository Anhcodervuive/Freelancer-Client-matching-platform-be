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

const CLIENTS: ClientSeed[] = [
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
                description: 'Fintech innovation lab đầu tư MVP và kết nối ngân hàng truyền thống.'
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
                description: 'Startup booking tour miền Trung, cần nền tảng web/mobile tối ưu chuyển đổi.'
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
                description: 'Chuyên gia phân tích sinh học cần dashboard dữ liệu từ lab thiết bị IoT.'
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
                description: 'Chuỗi bán lẻ khu vực SEA cần tối ưu hoá OMS, tích hợp kho & logistics.'
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
                description: 'Studio kiến trúc xanh muốn dựng landing page 3D trình diễn concept.'
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
                description: 'Tư vấn quản trị dữ liệu, cần BI portal nội bộ và self-serve analytics.'
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
                description: 'Marketplace đặc sản Latin America cần cải thiện trải nghiệm mobile.'
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
                description: 'Tập đoàn y tế triển khai app chăm sóc hậu phẫu, cần HIPAA-ready backend.'
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
                description: 'Founder mảng AI khí hậu muốn prototype mô hình dự báo tưới tiêu thông minh.'
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
                description: 'Nhà mốt boutique muốn dựng lookbook AR và hệ thống đặt lịch fitting.'
        }
]

const FREELANCERS: FreelancerSeed[] = [
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
                bio: 'Xây microservice Node.js/NestJS và frontend Next.js tối ưu hiệu năng, từng scale hệ thống 2M MAU.',
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
                bio: 'Thiết kế UI component hướng accessibility, tối ưu Core Web Vitals cho SaaS B2B và e-commerce.',
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
                bio: '5 năm build super-app fintech & logistics với Flutter, CI/CD mobile và tối ưu hiệu năng animation.',
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
                bio: 'Thiết kế hạ tầng AWS multi-account, IaC Terraform, tối ưu cost và SRE cho sản phẩm tăng trưởng nhanh.',
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
                bio: 'Xây pipeline dữ liệu sự kiện, mô hình propensity/retention, trực quan hóa insight cho product-led growth.',
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
                bio: 'Triển khai model recommender và NLP trên GCP, tối ưu inference latency & MLOps CI/CD.',
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
                bio: 'Dẫn dắt discovery, wireframe, prototype high fidelity trong Figma, thiết lập design system đa sản phẩm.',
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
                bio: 'Kiểm thử xâm nhập web/mobile, harden cloud infra, thiết lập incident response playbook.',
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
                bio: 'Viết kịch bản E2E với Playwright/Cypress, tích hợp pipeline CI, xây chiến lược kiểm thử shift-left.',
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
                bio: 'Thiết kế API hiệu năng cao với Go và Spring Boot, tối ưu caching/observability cho hệ thống marketplace.',
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
                bio: 'Biên tập nội dung sản phẩm, microcopy, onboarding flows, A/B testing thông điệp giữ chân người dùng.',
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
                bio: 'Thiết lập observability stack, autoscaling Kubernetes, chaos testing để đảm bảo SLO 99.9%.',
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
                bio: 'Xây app native Kotlin, Jetpack Compose, tối ưu offline-first và testing pipelines.',
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
                bio: 'Phát triển app SwiftUI, tích hợp Apple Pay/TestFlight, tối ưu battery & accessibility.',
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
                bio: 'Xây data lakehouse với DBT + Airflow, CDC pipelines, đảm bảo chất lượng dữ liệu và governance.',
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
                bio: 'Xây gameplay loop, kinh tế in-game và tối ưu performance Unity cho mobile/VR titles.',
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
                bio: 'Thiết kế kịch bản load test JMeter/k6, phân tích bottleneck backend & tối ưu query/database.',
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
                bio: 'Realtime chat, video streaming với WebRTC/Socket.IO, tối ưu security và trải nghiệm tương tác.',
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
                bio: 'Phỏng vấn người dùng, field study, mapping journey và ưu tiên backlog theo insight định tính.',
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
                bio: 'Thiết lập mobile CI/CD (Bitrise/Fastlane), kiểm thử tự động, phân phối beta nhiều thị trường.',
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
                bio: 'Xây dashboard B2B với Vue/Nuxt, tối ưu performance, state management và unit test chắc chắn.',
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
                bio: 'Đánh giá tuân thủ ISO 27001, thiết lập policy, đào tạo bảo mật và roadmap remediation.',
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
                bio: 'Refactor monolith Rails, tách service Node, build GraphQL gateway và tối ưu DX CI/CD.',
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
