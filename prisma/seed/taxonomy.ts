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
        { id: 'skill_react', slug: 'react', name: 'React', description: 'Component-based library for building user interfaces.' },
        { id: 'skill_vue', slug: 'vue', name: 'Vue.js', description: 'Progressive framework for building reactive web interfaces.' },
        { id: 'skill_css', slug: 'css', name: 'CSS', description: 'Styling language for describing the look of web pages.' },
        { id: 'skill_nestjs', slug: 'nestjs', name: 'NestJS', description: 'Opinionated Node.js framework for building scalable APIs.' },
        { id: 'skill_postgresql', slug: 'postgresql', name: 'PostgreSQL', description: 'Open-source relational database.' },
        { id: 'skill_figma', slug: 'figma', name: 'Figma', description: 'Collaborative interface design tool.' },
        { id: 'skill_adobexd', slug: 'adobe-xd', name: 'Adobe XD', description: 'UI/UX design and prototyping tool.' },
        { id: 'skill_illustrator', slug: 'illustrator', name: 'Adobe Illustrator', description: 'Vector graphics editor and design program.' },
        { id: 'skill_seo', slug: 'seo', name: 'SEO', description: 'Search engine optimisation techniques.' },
        { id: 'skill_content_marketing', slug: 'content-marketing', name: 'Content Marketing', description: 'Creating and distributing valuable content.' },
        { id: 'skill_google_analytics', slug: 'google-analytics', name: 'Google Analytics', description: 'Analytics platform to measure website performance.' },
        { id: 'skill_data_analysis', slug: 'data-analysis', name: 'Data Analysis', description: 'Collecting, transforming and modeling data to discover insights.' },
        { id: 'skill_python', slug: 'python', name: 'Python', description: 'Versatile programming language widely used in data science.' },
        { id: 'skill_powerbi', slug: 'power-bi', name: 'Power BI', description: 'Business analytics service for interactive data visualisations.' },
        { id: 'skill_translation', slug: 'translation', name: 'Translation', description: 'Translating content across languages while preserving meaning.' },
        { id: 'skill_localisation', slug: 'localisation', name: 'Localisation', description: 'Adapting products to local languages and cultures.' },
        { id: 'skill_subtitling', slug: 'subtitling', name: 'Subtitling', description: 'Creating subtitles timed to audio for video content.' }
]

const TAXONOMY: SeedCategory[] = [
        {
                id: 'category_web_dev',
                slug: 'web-development',
                name: 'Web Development',
                description: 'Full-stack web application development and maintenance.',
                sortOrder: 1,
                suggestedSkillSlugs: ['javascript', 'typescript', 'nodejs'],
                specialties: [
                        {
                                id: 'specialty_frontend_dev',
                                slug: 'frontend-development',
                                name: 'Front-end Development',
                                description: 'Building responsive user interfaces.',
                                sortOrder: 1,
                                suggestedSkillSlugs: ['react', 'vue', 'css']
                        },
                        {
                                id: 'specialty_backend_dev',
                                slug: 'backend-development',
                                name: 'Back-end Development',
                                description: 'API and service development for the web.',
                                sortOrder: 2,
                                suggestedSkillSlugs: ['nodejs', 'nestjs', 'postgresql']
                        }
                ]
        },
        {
                id: 'category_design',
                slug: 'design-creative',
                name: 'Design & Creative',
                description: 'Visual, product, and experience design for digital products.',
                sortOrder: 2,
                suggestedSkillSlugs: ['figma', 'adobe-xd', 'illustrator'],
                specialties: [
                        {
                                id: 'specialty_uiux',
                                slug: 'ui-ux-design',
                                name: 'UI/UX Design',
                                description: 'Designing intuitive user experiences and interfaces.',
                                sortOrder: 1,
                                suggestedSkillSlugs: ['figma', 'adobe-xd', 'illustrator']
                        },
                        {
                                id: 'specialty_brand_identity',
                                slug: 'brand-identity',
                                name: 'Brand Identity Design',
                                description: 'Creating comprehensive visual identities for brands.',
                                sortOrder: 2,
                                suggestedSkillSlugs: ['illustrator', 'figma']
                        }
                ]
        },
        {
                id: 'category_marketing',
                slug: 'sales-marketing',
                name: 'Sales & Marketing',
                description: 'Digital marketing strategies to grow audiences and revenue.',
                sortOrder: 3,
                suggestedSkillSlugs: ['seo', 'content-marketing', 'google-analytics'],
                specialties: [
                        {
                                id: 'specialty_digital_marketing',
                                slug: 'digital-marketing',
                                name: 'Digital Marketing',
                                description: 'Planning and running digital marketing campaigns.',
                                sortOrder: 1,
                                suggestedSkillSlugs: ['seo', 'content-marketing', 'google-analytics']
                        },
                        {
                                id: 'specialty_content_strategy',
                                slug: 'content-strategy',
                                name: 'Content Strategy',
                                description: 'Developing content roadmaps for audience engagement.',
                                sortOrder: 2,
                                suggestedSkillSlugs: ['content-marketing', 'seo']
                        }
                ]
        },
        {
                id: 'category_data',
                slug: 'data-science-analytics',
                name: 'Data Science & Analytics',
                description: 'Extracting insights from data to inform business decisions.',
                sortOrder: 4,
                suggestedSkillSlugs: ['data-analysis', 'python', 'power-bi'],
                specialties: [
                        {
                                id: 'specialty_data_visualisation',
                                slug: 'data-visualisation',
                                name: 'Data Visualisation',
                                description: 'Communicating insights through charts and dashboards.',
                                sortOrder: 1,
                                suggestedSkillSlugs: ['power-bi', 'data-analysis']
                        },
                        {
                                id: 'specialty_machine_learning',
                                slug: 'machine-learning',
                                name: 'Machine Learning',
                                description: 'Designing and training predictive models.',
                                sortOrder: 2,
                                suggestedSkillSlugs: ['python', 'data-analysis']
                        }
                ]
        },
        {
                id: 'category_translation',
                slug: 'translation',
                name: 'Translation',
                description: 'Professional translation and localisation services.',
                sortOrder: 5,
                suggestedSkillSlugs: ['translation', 'localisation'],
                specialties: [
                        {
                                id: 'specialty_localisation',
                                slug: 'localisation',
                                name: 'Localisation',
                                description: 'Adapting digital products for new markets.',
                                sortOrder: 1,
                                suggestedSkillSlugs: ['localisation', 'translation']
                        },
                        {
                                id: 'specialty_transcription',
                                slug: 'transcription-subtitling',
                                name: 'Transcription & Subtitling',
                                description: 'Preparing transcriptions and subtitles for multimedia.',
                                sortOrder: 2,
                                suggestedSkillSlugs: ['subtitling', 'translation']
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
