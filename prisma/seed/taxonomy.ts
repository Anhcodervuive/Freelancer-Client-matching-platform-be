import { prisma, runStep } from './_utils'

type SeedSpecialty = {
        id: string
        slug: string
        name: string
        description?: string
        sortOrder?: number
        suggestedSkillSlugs?: string[]
}

type SeedCategory = {
        id: string
        slug: string
        name: string
        description?: string
        sortOrder?: number
        suggestedSkillSlugs?: string[]
        specialties: SeedSpecialty[]
}

type SeedSkill = {
        id: string
        slug: string
        name: string
        description?: string
}

const SKILLS: SeedSkill[] = [
  { id: 'skill_javascript', slug: 'javascript', name: 'JavaScript', description: 'Programming language of the web.' },
  { id: 'skill_typescript', slug: 'typescript', name: 'TypeScript', description: 'Typed superset of JavaScript for large-scale apps.' },
  { id: 'skill_nodejs', slug: 'nodejs', name: 'Node.js', description: 'Runtime for building scalable server-side JavaScript applications.' },
  { id: 'skill_express', slug: 'express', name: 'Express.js', description: 'Minimalist web framework for Node.js APIs.' },
  { id: 'skill_nextjs', slug: 'nextjs', name: 'Next.js', description: 'React framework for hybrid static and server rendering.' },
  { id: 'skill_react', slug: 'react', name: 'React', description: 'Component-based library for building user interfaces.' },
  { id: 'skill_vue', slug: 'vue', name: 'Vue.js', description: 'Progressive framework for building reactive web interfaces.' },
  { id: 'skill_angular', slug: 'angular', name: 'Angular', description: 'Opinionated framework for enterprise web applications.' },
  { id: 'skill_svelte', slug: 'svelte', name: 'Svelte', description: 'Compiler-based approach for performant web apps.' },
  { id: 'skill_html', slug: 'html', name: 'HTML5', description: 'Markup language for structuring web documents.' },
  { id: 'skill_css', slug: 'css', name: 'CSS', description: 'Styling language for describing the look of web pages.' },
  { id: 'skill_tailwind', slug: 'tailwindcss', name: 'Tailwind CSS', description: 'Utility-first CSS framework for rapid UI building.' },
  { id: 'skill_graphql', slug: 'graphql', name: 'GraphQL', description: 'Query language for APIs and runtime for fulfilling those queries.' },
  { id: 'skill_rest_api', slug: 'rest-api', name: 'REST API Design', description: 'Principles and best practices for designing RESTful services.' },
  { id: 'skill_nestjs', slug: 'nestjs', name: 'NestJS', description: 'Opinionated Node.js framework for building scalable APIs.' },
  { id: 'skill_golang', slug: 'golang', name: 'Go', description: 'Compiled language for building concurrent services.' },
  { id: 'skill_java', slug: 'java', name: 'Java', description: 'General-purpose programming language used for enterprise systems.' },
  { id: 'skill_spring', slug: 'spring', name: 'Spring Boot', description: 'Framework for building production-grade Java services.' },
  { id: 'skill_python', slug: 'python', name: 'Python', description: 'Versatile programming language widely used in data science.' },
  { id: 'skill_machine_learning', slug: 'machine-learning', name: 'Machine Learning', description: 'Techniques for building predictive models and intelligent systems.' },
  { id: 'skill_django', slug: 'django', name: 'Django', description: 'Python framework for building robust web applications.' },
  { id: 'skill_fastapi', slug: 'fastapi', name: 'FastAPI', description: 'Fast Python framework for building async APIs.' },
  { id: 'skill_postgresql', slug: 'postgresql', name: 'PostgreSQL', description: 'Open-source relational database.' },
  { id: 'skill_mongodb', slug: 'mongodb', name: 'MongoDB', description: 'Document database for flexible schema design.' },
  { id: 'skill_redis', slug: 'redis', name: 'Redis', description: 'In-memory data store for caching and message queues.' },
  { id: 'skill_sql', slug: 'sql', name: 'SQL', description: 'Structured Query Language for relational data modeling.' },
  { id: 'skill_docker', slug: 'docker', name: 'Docker', description: 'Container platform for packaging applications.' },
  { id: 'skill_kubernetes', slug: 'kubernetes', name: 'Kubernetes', description: 'Container orchestration platform for managing workloads.' },
  { id: 'skill_aws', slug: 'aws', name: 'AWS', description: 'Amazon Web Services cloud platform.' },
  { id: 'skill_azure', slug: 'azure', name: 'Microsoft Azure', description: 'Microsoft cloud computing platform.' },
  { id: 'skill_gcp', slug: 'gcp', name: 'Google Cloud Platform', description: 'Google cloud computing platform and services.' },
  { id: 'skill_terraform', slug: 'terraform', name: 'Terraform', description: 'Infrastructure as code tool for provisioning cloud resources.' },
  { id: 'skill_ci_cd', slug: 'ci-cd', name: 'CI/CD Pipelines', description: 'Continuous integration and delivery automation.' },
  { id: 'skill_git', slug: 'git', name: 'Git', description: 'Distributed version control system.' },
  { id: 'skill_linux', slug: 'linux', name: 'Linux Administration', description: 'Managing Linux systems and services.' },
  { id: 'skill_bash', slug: 'bash', name: 'Bash Scripting', description: 'Shell scripting for automation on Unix-like systems.' },
  { id: 'skill_observability', slug: 'observability', name: 'Observability', description: 'Monitoring, logging, and tracing distributed systems.' },
  { id: 'skill_pandas', slug: 'pandas', name: 'Pandas', description: 'Python library for data manipulation and analysis.' },
  { id: 'skill_numpy', slug: 'numpy', name: 'NumPy', description: 'Python library for numerical computing.' },
  { id: 'skill_scikit', slug: 'scikit-learn', name: 'scikit-learn', description: 'Machine learning toolkit for Python.' },
  { id: 'skill_tensorflow', slug: 'tensorflow', name: 'TensorFlow', description: 'Deep learning platform from Google.' },
  { id: 'skill_pytorch', slug: 'pytorch', name: 'PyTorch', description: 'Deep learning framework from Meta AI.' },
  { id: 'skill_data_analysis', slug: 'data-analysis', name: 'Data Analysis', description: 'Collecting, transforming and modeling data to discover insights.' },
  { id: 'skill_data_engineering', slug: 'data-engineering', name: 'Data Engineering', description: 'Building data pipelines and processing infrastructure.' },
  { id: 'skill_airflow', slug: 'airflow', name: 'Apache Airflow', description: 'Workflow scheduler for orchestrating data pipelines.' },
  { id: 'skill_powerbi', slug: 'power-bi', name: 'Power BI', description: 'Business analytics service for interactive data visualisations.' },
  { id: 'skill_tableau', slug: 'tableau', name: 'Tableau', description: 'Visual analytics platform for business intelligence.' },
  { id: 'skill_flutter', slug: 'flutter', name: 'Flutter', description: 'Google UI toolkit for building natively compiled apps.' },
  { id: 'skill_react_native', slug: 'react-native', name: 'React Native', description: 'React-based framework for building native mobile apps.' },
  { id: 'skill_swift', slug: 'swift', name: 'Swift', description: 'Programming language for Apple platforms.' },
  { id: 'skill_kotlin', slug: 'kotlin', name: 'Kotlin', description: 'Modern programming language for Android and back-end development.' },
  { id: 'skill_android', slug: 'android', name: 'Android SDK', description: 'Tools and libraries for native Android development.' },
  { id: 'skill_ios', slug: 'ios', name: 'iOS SDK', description: 'Frameworks for building native iOS applications.' },
  { id: 'skill_pen_testing', slug: 'penetration-testing', name: 'Penetration Testing', description: 'Simulating attacks to evaluate security posture.' },
  { id: 'skill_network_security', slug: 'network-security', name: 'Network Security', description: 'Protecting networks from unauthorised access and misuse.' },
  { id: 'skill_application_security', slug: 'application-security', name: 'Application Security', description: 'Securing software applications throughout the SDLC.' },
  { id: 'skill_incident_response', slug: 'incident-response', name: 'Incident Response', description: 'Managing and mitigating security incidents.' },
  { id: 'skill_security_compliance', slug: 'security-compliance', name: 'Security Compliance', description: 'Meeting industry standards and regulatory requirements.' },
  { id: 'skill_security_governance', slug: 'security-governance', name: 'Security Governance', description: 'Establishing policies and controls for cybersecurity programs.' },
  { id: 'skill_manual_testing', slug: 'manual-testing', name: 'Manual Testing', description: 'Exploratory and scripted software testing without automation.' },
  { id: 'skill_test_automation', slug: 'test-automation', name: 'Test Automation', description: 'Designing and maintaining automated test suites.' },
  { id: 'skill_selenium', slug: 'selenium', name: 'Selenium', description: 'Automation toolkit for browser-based testing.' },
  { id: 'skill_cypress', slug: 'cypress', name: 'Cypress', description: 'JavaScript end-to-end testing framework.' },
  { id: 'skill_playwright', slug: 'playwright', name: 'Playwright', description: 'Cross-browser automation framework for testing web apps.' },
  { id: 'skill_jest', slug: 'jest', name: 'Jest', description: 'Delightful JavaScript testing framework.' },
  { id: 'skill_api_testing', slug: 'api-testing', name: 'API Testing', description: 'Validating functionality, reliability, and security of APIs.' },
  { id: 'skill_postman', slug: 'postman', name: 'Postman', description: 'Collaboration platform for API design and testing.' },
  { id: 'skill_performance_testing', slug: 'performance-testing', name: 'Performance Testing', description: 'Assessing system stability under load.' },
  { id: 'skill_figma', slug: 'figma', name: 'Figma', description: 'Collaborative interface design tool.' },
  { id: 'skill_adobexd', slug: 'adobe-xd', name: 'Adobe XD', description: 'UI/UX design and prototyping tool.' },
  { id: 'skill_illustrator', slug: 'illustrator', name: 'Adobe Illustrator', description: 'Vector graphics editor and design program.' },
  { id: 'skill_design_systems', slug: 'design-systems', name: 'Design Systems', description: 'Guidelines and components for consistent digital products.' },
  { id: 'skill_ux_research', slug: 'ux-research', name: 'UX Research', description: 'Studying users to inform product decisions.' },
  { id: 'skill_product_discovery', slug: 'product-discovery', name: 'Product Discovery', description: 'Validating product ideas before delivery.' },
  { id: 'skill_unity', slug: 'unity', name: 'Unity', description: 'Real-time 3D development platform.' },
  { id: 'skill_unreal', slug: 'unreal-engine', name: 'Unreal Engine', description: 'High-fidelity game engine from Epic Games.' },
  { id: 'skill_csharp', slug: 'c-sharp', name: 'C#', description: 'Modern object-oriented language from Microsoft.' },
  { id: 'skill_cpp', slug: 'c-plus-plus', name: 'C++', description: 'Compiled language for high-performance applications.' },
  { id: 'skill_blender', slug: 'blender', name: 'Blender', description: 'Open-source 3D creation suite for modeling and animation.' }
]

const TAXONOMY: SeedCategory[] = [
  {
    id: 'category_web_dev',
    slug: 'web-development',
    name: 'Web Development',
    description: 'Full-stack web application development and maintenance.',
    sortOrder: 1,
    suggestedSkillSlugs: ['javascript', 'typescript', 'react', 'nextjs', 'nodejs', 'graphql', 'rest-api'],
    specialties: [
      {
        id: 'specialty_frontend_dev',
        slug: 'frontend-development',
        name: 'Front-end Development',
        description: 'Building responsive user interfaces.',
        sortOrder: 1,
        suggestedSkillSlugs: ['javascript', 'typescript', 'react', 'vue', 'angular', 'css', 'tailwindcss', 'html']
      },
      {
        id: 'specialty_backend_dev',
        slug: 'backend-development',
        name: 'Back-end Development',
        description: 'API and service development for the web.',
        sortOrder: 2,
        suggestedSkillSlugs: ['nodejs', 'nestjs', 'express', 'golang', 'java', 'spring', 'postgresql', 'mongodb', 'redis']
      },
      {
        id: 'specialty_fullstack_dev',
        slug: 'fullstack-development',
        name: 'Full-stack Development',
        description: 'End-to-end delivery across the web stack.',
        sortOrder: 3,
        suggestedSkillSlugs: ['nextjs', 'react', 'nodejs', 'graphql', 'rest-api', 'postgresql', 'git']
      },
      {
        id: 'specialty_webops',
        slug: 'web-operations',
        name: 'WebOps & Performance',
        description: 'Operating, monitoring, and optimising web applications.',
        sortOrder: 4,
        suggestedSkillSlugs: ['observability', 'ci-cd', 'docker', 'linux', 'rest-api']
      }
    ]
  },
  {
    id: 'category_mobile_dev',
    slug: 'mobile-development',
    name: 'Mobile Development',
    description: 'Building native and cross-platform mobile applications.',
    sortOrder: 2,
    suggestedSkillSlugs: ['flutter', 'react-native', 'swift', 'kotlin', 'android', 'ios'],
    specialties: [
      {
        id: 'specialty_cross_platform_mobile',
        slug: 'cross-platform-mobile',
        name: 'Cross-platform Mobile Apps',
        description: 'Delivering mobile products with shared codebases.',
        sortOrder: 1,
        suggestedSkillSlugs: ['flutter', 'react-native', 'typescript', 'graphql']
      },
      {
        id: 'specialty_native_ios',
        slug: 'native-ios',
        name: 'Native iOS Development',
        description: 'Crafting polished experiences for the Apple ecosystem.',
        sortOrder: 2,
        suggestedSkillSlugs: ['swift', 'ios', 'rest-api', 'ci-cd']
      },
      {
        id: 'specialty_native_android',
        slug: 'native-android',
        name: 'Native Android Development',
        description: 'Building performant apps for Android devices.',
        sortOrder: 3,
        suggestedSkillSlugs: ['kotlin', 'android', 'java', 'rest-api']
      },
      {
        id: 'specialty_mobile_devops',
        slug: 'mobile-devops',
        name: 'Mobile DevOps',
        description: 'Automating build, test, and release workflows for mobile.',
        sortOrder: 4,
        suggestedSkillSlugs: ['ci-cd', 'test-automation', 'git', 'manual-testing']
      }
    ]
  },
  {
    id: 'category_cloud_devops',
    slug: 'cloud-devops',
    name: 'Cloud & DevOps',
    description: 'Cloud infrastructure, automation, and reliability engineering.',
    sortOrder: 3,
    suggestedSkillSlugs: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci-cd', 'linux'],
    specialties: [
      {
        id: 'specialty_cloud_architecture',
        slug: 'cloud-architecture',
        name: 'Cloud Architecture',
        description: 'Designing secure, scalable, and cost-efficient cloud systems.',
        sortOrder: 1,
        suggestedSkillSlugs: ['aws', 'azure', 'gcp', 'linux', 'network-security']
      },
      {
        id: 'specialty_container_platforms',
        slug: 'container-platforms',
        name: 'Container Platforms',
        description: 'Operating containerised workloads at scale.',
        sortOrder: 2,
        suggestedSkillSlugs: ['docker', 'kubernetes', 'observability', 'golang']
      },
      {
        id: 'specialty_infrastructure_code',
        slug: 'infrastructure-as-code',
        name: 'Infrastructure as Code',
        description: 'Automating infrastructure provisioning and compliance.',
        sortOrder: 3,
        suggestedSkillSlugs: ['terraform', 'aws', 'azure', 'gcp', 'bash']
      },
      {
        id: 'specialty_sre',
        slug: 'site-reliability-engineering',
        name: 'Site Reliability Engineering',
        description: 'Ensuring availability with automation and observability.',
        sortOrder: 4,
        suggestedSkillSlugs: ['observability', 'ci-cd', 'linux', 'incident-response']
      }
    ]
  },
  {
    id: 'category_data',
    slug: 'data-science-analytics',
    name: 'Data Science & AI',
    description: 'Building intelligent products with analytics, ML, and reliable data platforms.',
    sortOrder: 4,
    suggestedSkillSlugs: ['python', 'pandas', 'scikit-learn', 'tensorflow', 'pytorch', 'sql', 'data-engineering', 'airflow', 'power-bi'],
    specialties: [
      {
        id: 'specialty_data_science',
        slug: 'data-science',
        name: 'Data Science',
        description: 'Discovering insights with statistics and experimentation.',
        sortOrder: 1,
        suggestedSkillSlugs: ['python', 'pandas', 'numpy', 'data-analysis', 'sql']
      },
      {
        id: 'specialty_machine_learning',
        slug: 'machine-learning',
        name: 'Machine Learning Engineering',
        description: 'Designing, training, and deploying predictive models.',
        sortOrder: 2,
        suggestedSkillSlugs: ['scikit-learn', 'tensorflow', 'pytorch', 'python', 'ci-cd']
      },
      {
        id: 'specialty_data_engineering',
        slug: 'data-engineering',
        name: 'Data Engineering',
        description: 'Reliable batch and streaming data platforms.',
        sortOrder: 3,
        suggestedSkillSlugs: ['data-engineering', 'airflow', 'python', 'sql', 'aws']
      },
      {
        id: 'specialty_business_intelligence',
        slug: 'business-intelligence',
        name: 'Business Intelligence',
        description: 'Visualising metrics for decision-making.',
        sortOrder: 4,
        suggestedSkillSlugs: ['power-bi', 'tableau', 'sql', 'data-analysis']
      },
      {
        id: 'specialty_mlops',
        slug: 'mlops',
        name: 'MLOps',
        description: 'Operationalising machine learning with automation.',
        sortOrder: 5,
        suggestedSkillSlugs: ['ci-cd', 'docker', 'kubernetes', 'tensorflow', 'pytorch']
      }
    ]
  },
  {
    id: 'category_cybersecurity',
    slug: 'cybersecurity',
    name: 'Cybersecurity',
    description: 'Securing infrastructure, applications, and data from threats.',
    sortOrder: 5,
    suggestedSkillSlugs: ['penetration-testing', 'network-security', 'application-security', 'incident-response', 'security-governance', 'security-compliance'],
    specialties: [
      {
        id: 'specialty_offensive_security',
        slug: 'offensive-security',
        name: 'Offensive Security',
        description: 'Assessing defences through ethical hacking engagements.',
        sortOrder: 1,
        suggestedSkillSlugs: ['penetration-testing', 'network-security', 'bash', 'linux']
      },
      {
        id: 'specialty_defensive_security',
        slug: 'defensive-security',
        name: 'Defensive Security',
        description: 'Hardening systems and remediating vulnerabilities.',
        sortOrder: 2,
        suggestedSkillSlugs: ['application-security', 'network-security', 'observability', 'aws']
      },
      {
        id: 'specialty_security_operations',
        slug: 'security-operations',
        name: 'Security Operations',
        description: 'Monitoring, detection, and rapid response capabilities.',
        sortOrder: 3,
        suggestedSkillSlugs: ['incident-response', 'observability', 'ci-cd', 'linux']
      },
      {
        id: 'specialty_grc',
        slug: 'governance-risk-compliance',
        name: 'Governance, Risk & Compliance',
        description: 'Implementing controls, audits, and risk management.',
        sortOrder: 4,
        suggestedSkillSlugs: ['security-governance', 'security-compliance', 'incident-response']
      }
    ]
  },
  {
    id: 'category_quality_assurance',
    slug: 'quality-assurance',
    name: 'Quality Assurance & Testing',
    description: 'Ensuring product quality through manual and automated testing.',
    sortOrder: 6,
    suggestedSkillSlugs: ['manual-testing', 'test-automation', 'selenium', 'cypress', 'playwright', 'api-testing', 'performance-testing'],
    specialties: [
      {
        id: 'specialty_manual_testing',
        slug: 'manual-qa',
        name: 'Manual Quality Assurance',
        description: 'Test planning, exploratory testing, and regression passes.',
        sortOrder: 1,
        suggestedSkillSlugs: ['manual-testing', 'api-testing', 'postman']
      },
      {
        id: 'specialty_test_automation',
        slug: 'test-automation',
        name: 'Test Automation',
        description: 'Automating regression and integration tests.',
        sortOrder: 2,
        suggestedSkillSlugs: ['test-automation', 'selenium', 'cypress', 'playwright', 'jest']
      },
      {
        id: 'specialty_api_testing',
        slug: 'api-testing',
        name: 'API & Integration Testing',
        description: 'Validating REST and GraphQL services and integrations.',
        sortOrder: 3,
        suggestedSkillSlugs: ['api-testing', 'postman', 'rest-api', 'graphql']
      },
      {
        id: 'specialty_performance_testing',
        slug: 'performance-testing',
        name: 'Performance & Reliability Testing',
        description: 'Ensuring systems scale under load.',
        sortOrder: 4,
        suggestedSkillSlugs: ['performance-testing', 'observability', 'ci-cd', 'linux']
      }
    ]
  },
  {
    id: 'category_design',
    slug: 'product-design-ux',
    name: 'Product Design & UX',
    description: 'Designing user-centred digital products and experiences.',
    sortOrder: 7,
    suggestedSkillSlugs: ['figma', 'adobe-xd', 'illustrator', 'design-systems', 'ux-research', 'product-discovery'],
    specialties: [
      {
        id: 'specialty_uiux',
        slug: 'ui-ux-design',
        name: 'UI/UX Design',
        description: 'Designing intuitive user experiences and interfaces.',
        sortOrder: 1,
        suggestedSkillSlugs: ['figma', 'adobe-xd', 'illustrator', 'ux-research']
      },
      {
        id: 'specialty_design_systems',
        slug: 'design-systems',
        name: 'Design Systems',
        description: 'Scaling UI through reusable components and tokens.',
        sortOrder: 2,
        suggestedSkillSlugs: ['design-systems', 'figma', 'css', 'tailwindcss']
      },
      {
        id: 'specialty_ux_research',
        slug: 'ux-research',
        name: 'UX Research',
        description: 'Understanding user needs through qualitative and quantitative methods.',
        sortOrder: 3,
        suggestedSkillSlugs: ['ux-research', 'product-discovery', 'figma']
      },
      {
        id: 'specialty_product_strategy',
        slug: 'product-strategy',
        name: 'Product Strategy',
        description: 'Aligning discovery insights with roadmap priorities.',
        sortOrder: 4,
        suggestedSkillSlugs: ['product-discovery', 'ux-research', 'data-analysis']
      }
    ]
  },
  {
    id: 'category_game_dev',
    slug: 'game-development',
    name: 'Game Development & XR',
    description: 'Interactive entertainment, simulations, and immersive experiences.',
    sortOrder: 8,
    suggestedSkillSlugs: ['unity', 'unreal-engine', 'c-sharp', 'c-plus-plus', 'blender'],
    specialties: [
      {
        id: 'specialty_unity_dev',
        slug: 'unity-development',
        name: 'Unity Development',
        description: 'Gameplay programming and tooling with Unity.',
        sortOrder: 1,
        suggestedSkillSlugs: ['unity', 'c-sharp', 'blender']
      },
      {
        id: 'specialty_unreal_dev',
        slug: 'unreal-development',
        name: 'Unreal Engine Development',
        description: 'High-fidelity experiences with Unreal Engine.',
        sortOrder: 2,
        suggestedSkillSlugs: ['unreal-engine', 'c-plus-plus', 'blender']
      },
      {
        id: 'specialty_technical_art',
        slug: 'technical-art',
        name: 'Technical Art & Tools',
        description: 'Bridging art and engineering for real-time pipelines.',
        sortOrder: 3,
        suggestedSkillSlugs: ['blender', 'python', 'unity']
      },
      {
        id: 'specialty_vr_ar',
        slug: 'vr-ar',
        name: 'VR/AR Experiences',
        description: 'Immersive applications for headsets and spatial devices.',
        sortOrder: 4,
        suggestedSkillSlugs: ['unity', 'unreal-engine', 'c-sharp', 'c-plus-plus']
      }
    ]
  }
]

const SKILL_BY_SLUG = new Map(SKILLS.map(skill => [skill.slug, skill]))

function resolveSkillId(slug: string): string {
        const skill = SKILL_BY_SLUG.get(slug)
        if (!skill) {
                throw new Error(`Unknown skill slug: ${slug}`)
        }
        return skill.id
}

function buildCategorySkillData() {
        return TAXONOMY.flatMap(category =>
                (category.suggestedSkillSlugs ?? []).map((slug, index) => ({
                        categoryId: category.id,
                        skillId: resolveSkillId(slug),
                        weight: Math.max(30, 70 - index * 10)
                }))
        )
}

function buildSpecialtySkillData() {
        return TAXONOMY.flatMap(category =>
                category.specialties.flatMap(specialty =>
                        (specialty.suggestedSkillSlugs ?? []).map((slug, index) => ({
                                specialtyId: specialty.id,
                                skillId: resolveSkillId(slug),
                                weight: Math.max(40, 80 - index * 10)
                        }))
                )
        )
}

export async function seedTaxonomy() {
        await runStep('Skills', async () => {
                await prisma.skill.createMany({ data: SKILLS, skipDuplicates: true })
        })

        await runStep('Categories', async () => {
                const categoryData = TAXONOMY.map(({ specialties, suggestedSkillSlugs, ...category }) => ({
                        ...category,
                        sortOrder: category.sortOrder ?? 0
                }))
                await prisma.category.createMany({ data: categoryData, skipDuplicates: true })
        })

        await runStep('Specialties', async () => {
                const specialtyData = TAXONOMY.flatMap(category =>
                        category.specialties.map(({ suggestedSkillSlugs, ...specialty }, index) => ({
                                ...specialty,
                                categoryId: category.id,
                                sortOrder: specialty.sortOrder ?? index + 1
                        }))
                )
                await prisma.specialty.createMany({ data: specialtyData, skipDuplicates: true })
        })

        await runStep('Category skill suggestions', async () => {
                const categorySkills = buildCategorySkillData()
                if (categorySkills.length) {
                        await prisma.categorySkill.createMany({ data: categorySkills, skipDuplicates: true })
                }
        })

        await runStep('Specialty skill suggestions', async () => {
                const specialtySkills = buildSpecialtySkillData()
                if (specialtySkills.length) {
                        await prisma.specialtySkill.createMany({ data: specialtySkills, skipDuplicates: true })
                }
        })
}
