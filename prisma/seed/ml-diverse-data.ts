/**
 * ML Diverse Data Seeding - Simplified version
 * Tạo dữ liệu đa dạng cho việc train ML models
 */

import {
  JobDurationCommitment, JobExperienceLevel, JobLocationType, JobPaymentMode,
  JobStatus, JobVisibility, Prisma, Role, CompanySize, JobInvitationStatus,
  JobProposalStatus, MatchInteractionType, MatchInteractionSource, LanguageProficiency
} from '../../src/generated/prisma'
import bcrypt from 'bcrypt'
import { prisma, runStep } from './_utils'

const TEST_PASSWORD_HASH = bcrypt.hashSync('TestPassword!123', 10)
const VERIFIED_AT = new Date('2024-01-15T00:00:00.000Z')

function seededRandom(seed: number): () => number {
  return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
}

function pickRandom<T>(array: T[], count: number, random: () => number): T[] {
  const result = [...array]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j]!, result[i]!] }
  return result.slice(0, Math.min(count, array.length))
}

function pickOne<T>(array: T[], random: () => number): T { return array[Math.floor(random() * array.length)]! }

// Constants
const LOCATIONS = [
  { city: 'San Francisco', country: 'USA' }, { city: 'New York', country: 'USA' }, { city: 'London', country: 'UK' },
  { city: 'Berlin', country: 'Germany' }, { city: 'Singapore', country: 'Singapore' }, { city: 'Tokyo', country: 'Japan' },
  { city: 'Ho Chi Minh City', country: 'Vietnam' }, { city: 'Sydney', country: 'Australia' }, { city: 'Toronto', country: 'Canada' },
  { city: 'Dubai', country: 'UAE' }, { city: 'Seoul', country: 'South Korea' }, { city: 'Mumbai', country: 'India' }
]

const FIRST_NAMES = ['James', 'Emma', 'Michael', 'Olivia', 'David', 'Sophia', 'Wei', 'Yuki', 'Carlos', 'Maria', 'Ahmed', 'Fatima', 'Raj', 'Priya', 'Liam', 'Ava', 'Noah', 'Luna']
const LAST_NAMES = ['Smith', 'Johnson', 'Chen', 'Wang', 'Kim', 'Park', 'Patel', 'Garcia', 'Mueller', 'Tanaka', 'Nguyen', 'Lee', 'Brown', 'Wilson', 'Taylor', 'Anderson']
const COMPANY_NAMES = ['Tech', 'Digital', 'Cloud', 'Data', 'Smart', 'Next', 'Alpha', 'Nova', 'Apex', 'Swift', 'Bright', 'Core']
const COMPANY_SUFFIXES = ['Solutions', 'Labs', 'Studio', 'Inc', 'Co', 'Digital', 'Software', 'Apps', 'Services', 'Hub']


// Job Templates - 100+ diverse templates
const JOB_TEMPLATES = [
  // Frontend (10)
  { title: 'Build React Dashboard with Charts', skills: ['skill_react', 'skill_typescript', 'skill_css', 'skill_tailwind', 'skill_redux'], category: 'category_web_dev', specialty: 'specialty_frontend_dev', budget: [8000, 25000] },
  { title: 'Develop Next.js E-commerce Platform', skills: ['skill_nextjs', 'skill_react', 'skill_typescript', 'skill_tailwind', 'skill_prisma'], category: 'category_web_dev', specialty: 'specialty_frontend_dev', budget: [15000, 40000] },
  { title: 'Create Vue.js CRM Application', skills: ['skill_vue', 'skill_typescript', 'skill_css', 'skill_rest_api', 'skill_nuxtjs'], category: 'category_web_dev', specialty: 'specialty_frontend_dev', budget: [6000, 18000] },
  { title: 'Build Angular Enterprise Dashboard', skills: ['skill_angular', 'skill_typescript', 'skill_css', 'skill_sass', 'skill_graphql'], category: 'category_web_dev', specialty: 'specialty_frontend_dev', budget: [12000, 35000] },
  { title: 'Create Marketing Landing Pages', skills: ['skill_html', 'skill_css', 'skill_javascript', 'skill_tailwind'], category: 'category_web_dev', specialty: 'specialty_frontend_dev', budget: [2000, 8000] },
  { title: 'Build React Component Library', skills: ['skill_react', 'skill_typescript', 'skill_storybook', 'skill_jest', 'skill_css'], category: 'category_web_dev', specialty: 'specialty_frontend_dev', budget: [10000, 28000] },
  { title: 'Develop Svelte Web Application', skills: ['skill_svelte', 'skill_typescript', 'skill_css', 'skill_rest_api'], category: 'category_web_dev', specialty: 'specialty_frontend_dev', budget: [8000, 22000] },
  { title: 'Build Progressive Web App', skills: ['skill_react', 'skill_typescript', 'skill_javascript', 'skill_css', 'skill_tailwind'], category: 'category_web_dev', specialty: 'specialty_frontend_dev', budget: [10000, 30000] },
  { title: 'Create Admin Panel with React', skills: ['skill_react', 'skill_typescript', 'skill_tailwind', 'skill_rest_api', 'skill_redux'], category: 'category_web_dev', specialty: 'specialty_frontend_dev', budget: [7000, 20000] },
  { title: 'Build Real-time Chat Interface', skills: ['skill_react', 'skill_typescript', 'skill_css', 'skill_graphql'], category: 'category_web_dev', specialty: 'specialty_frontend_dev', budget: [9000, 25000] },
  // Backend (10)
  { title: 'Design REST API with Node.js & Express', skills: ['skill_nodejs', 'skill_express', 'skill_postgresql', 'skill_rest_api', 'skill_typescript'], category: 'category_web_dev', specialty: 'specialty_backend_dev', budget: [10000, 35000] },
  { title: 'Build GraphQL API with Apollo', skills: ['skill_nodejs', 'skill_graphql', 'skill_mongodb', 'skill_typescript', 'skill_redis'], category: 'category_web_dev', specialty: 'specialty_backend_dev', budget: [12000, 38000] },
  { title: 'Develop NestJS Microservices Architecture', skills: ['skill_nestjs', 'skill_typescript', 'skill_postgresql', 'skill_docker', 'skill_rabbitmq'], category: 'category_web_dev', specialty: 'specialty_backend_dev', budget: [20000, 55000] },
  { title: 'Create FastAPI High-Performance Backend', skills: ['skill_python', 'skill_fastapi', 'skill_postgresql', 'skill_rest_api', 'skill_redis'], category: 'category_web_dev', specialty: 'specialty_backend_dev', budget: [10000, 32000] },
  { title: 'Build Django REST Framework API', skills: ['skill_python', 'skill_django', 'skill_postgresql', 'skill_rest_api', 'skill_docker'], category: 'category_web_dev', specialty: 'specialty_backend_dev', budget: [8000, 25000] },
  { title: 'Develop Go Microservices with gRPC', skills: ['skill_golang', 'skill_postgresql', 'skill_docker', 'skill_kubernetes', 'skill_redis'], category: 'category_web_dev', specialty: 'specialty_backend_dev', budget: [15000, 45000] },
  { title: 'Build Spring Boot Enterprise API', skills: ['skill_java', 'skill_spring', 'skill_postgresql', 'skill_rest_api', 'skill_docker'], category: 'category_web_dev', specialty: 'specialty_backend_dev', budget: [12000, 40000] },
  { title: 'Create Laravel REST API', skills: ['skill_php', 'skill_laravel', 'skill_mysql', 'skill_rest_api', 'skill_redis'], category: 'category_web_dev', specialty: 'specialty_backend_dev', budget: [6000, 22000] },
  { title: 'Build Real-time WebSocket Server', skills: ['skill_nodejs', 'skill_typescript', 'skill_redis', 'skill_postgresql'], category: 'category_web_dev', specialty: 'specialty_backend_dev', budget: [12000, 35000] },
  { title: 'Develop Ruby on Rails API', skills: ['skill_ruby', 'skill_rails', 'skill_postgresql', 'skill_rest_api', 'skill_redis'], category: 'category_web_dev', specialty: 'specialty_backend_dev', budget: [10000, 35000] },
  // Fullstack (8)
  { title: 'Build SaaS Application with Stripe', skills: ['skill_nextjs', 'skill_typescript', 'skill_postgresql', 'skill_tailwind', 'skill_prisma'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev', budget: [18000, 55000] },
  { title: 'Develop Online Booking Platform', skills: ['skill_react', 'skill_nodejs', 'skill_postgresql', 'skill_redis', 'skill_typescript'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev', budget: [15000, 42000] },
  { title: 'Create Social Media Platform', skills: ['skill_react', 'skill_nodejs', 'skill_mongodb', 'skill_graphql', 'skill_redis'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev', budget: [25000, 65000] },
  { title: 'Build Project Management Tool', skills: ['skill_react', 'skill_nodejs', 'skill_postgresql', 'skill_typescript', 'skill_tailwind'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev', budget: [18000, 50000] },
  { title: 'Develop E-learning Platform', skills: ['skill_nextjs', 'skill_nodejs', 'skill_postgresql', 'skill_typescript', 'skill_tailwind'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev', budget: [20000, 55000] },
  { title: 'Build Marketplace Application', skills: ['skill_react', 'skill_nodejs', 'skill_postgresql', 'skill_elasticsearch', 'skill_redis'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev', budget: [22000, 60000] },
  { title: 'Create CRM System', skills: ['skill_react', 'skill_nodejs', 'skill_postgresql', 'skill_typescript', 'skill_graphql'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev', budget: [16000, 45000] },
  { title: 'Develop Inventory Management System', skills: ['skill_react', 'skill_nodejs', 'skill_postgresql', 'skill_typescript', 'skill_rest_api'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev', budget: [14000, 40000] },
  // Mobile (8)
  { title: 'Build Flutter E-commerce App', skills: ['skill_flutter', 'skill_rest_api', 'skill_firebase'], category: 'category_mobile_dev', specialty: 'specialty_cross_platform_mobile', budget: [12000, 40000] },
  { title: 'Develop React Native Social App', skills: ['skill_react_native', 'skill_typescript', 'skill_rest_api', 'skill_redux'], category: 'category_mobile_dev', specialty: 'specialty_cross_platform_mobile', budget: [8000, 28000] },
  { title: 'Create iOS Banking App', skills: ['skill_swift', 'skill_ios', 'skill_rest_api', 'skill_ci_cd'], category: 'category_mobile_dev', specialty: 'specialty_native_ios', budget: [15000, 45000] },
  { title: 'Build Android Fitness App', skills: ['skill_kotlin', 'skill_android', 'skill_rest_api', 'skill_firebase'], category: 'category_mobile_dev', specialty: 'specialty_native_android', budget: [12000, 38000] },
  { title: 'Develop Flutter Fintech App', skills: ['skill_flutter', 'skill_rest_api', 'skill_firebase', 'skill_ci_cd'], category: 'category_mobile_dev', specialty: 'specialty_cross_platform_mobile', budget: [18000, 50000] },
  { title: 'Create React Native Delivery App', skills: ['skill_react_native', 'skill_typescript', 'skill_rest_api', 'skill_graphql'], category: 'category_mobile_dev', specialty: 'specialty_cross_platform_mobile', budget: [14000, 42000] },
  { title: 'Build iOS Healthcare App', skills: ['skill_swift', 'skill_ios', 'skill_rest_api', 'skill_firebase'], category: 'category_mobile_dev', specialty: 'specialty_native_ios', budget: [20000, 55000] },
  { title: 'Develop Android E-commerce App', skills: ['skill_kotlin', 'skill_android', 'skill_rest_api', 'skill_firebase'], category: 'category_mobile_dev', specialty: 'specialty_native_android', budget: [15000, 45000] },
  // DevOps (6)
  { title: 'Set Up GitHub Actions CI/CD', skills: ['skill_docker', 'skill_ci_cd', 'skill_linux', 'skill_aws'], category: 'category_cloud_devops', specialty: 'specialty_infrastructure_code', budget: [8000, 28000] },
  { title: 'Design AWS Infrastructure with Terraform', skills: ['skill_aws', 'skill_terraform', 'skill_docker', 'skill_linux', 'skill_kubernetes'], category: 'category_cloud_devops', specialty: 'specialty_cloud_architecture', budget: [22000, 58000] },
  { title: 'Implement Kubernetes on GCP', skills: ['skill_kubernetes', 'skill_docker', 'skill_linux', 'skill_gcp', 'skill_terraform'], category: 'category_cloud_devops', specialty: 'specialty_container_platforms', budget: [15000, 42000] },
  { title: 'Set Up Prometheus Monitoring', skills: ['skill_observability', 'skill_linux', 'skill_docker', 'skill_kubernetes'], category: 'category_cloud_devops', specialty: 'specialty_sre', budget: [12000, 35000] },
  { title: 'Configure Azure DevOps Pipeline', skills: ['skill_azure', 'skill_docker', 'skill_ci_cd', 'skill_linux', 'skill_terraform'], category: 'category_cloud_devops', specialty: 'specialty_infrastructure_code', budget: [10000, 32000] },
  { title: 'Build GitOps Workflow with ArgoCD', skills: ['skill_kubernetes', 'skill_docker', 'skill_ci_cd', 'skill_linux'], category: 'category_cloud_devops', specialty: 'specialty_container_platforms', budget: [14000, 40000] },
  // Data/ML (6)
  { title: 'Build ML Prediction Model', skills: ['skill_python', 'skill_scikit', 'skill_pandas', 'skill_numpy'], category: 'category_data', specialty: 'specialty_machine_learning', budget: [15000, 48000] },
  { title: 'Develop Deep Learning with PyTorch', skills: ['skill_python', 'skill_pytorch', 'skill_tensorflow', 'skill_pandas'], category: 'category_data', specialty: 'specialty_machine_learning', budget: [22000, 60000] },
  { title: 'Create ETL Data Pipeline', skills: ['skill_python', 'skill_sql', 'skill_airflow', 'skill_postgresql'], category: 'category_data', specialty: 'specialty_data_engineering', budget: [15000, 42000] },
  { title: 'Build Power BI Dashboard', skills: ['skill_sql', 'skill_tableau', 'skill_python', 'skill_pandas'], category: 'category_data', specialty: 'specialty_business_intelligence', budget: [6000, 22000] },
  { title: 'Develop NLP Text Classification', skills: ['skill_python', 'skill_pytorch', 'skill_pandas', 'skill_numpy'], category: 'category_data', specialty: 'specialty_machine_learning', budget: [18000, 50000] },
  { title: 'Build Recommendation System', skills: ['skill_python', 'skill_tensorflow', 'skill_pandas', 'skill_sql'], category: 'category_data', specialty: 'specialty_machine_learning', budget: [20000, 55000] },
  // Design (4)
  { title: 'Design Mobile App UI/UX', skills: ['skill_figma', 'skill_ux_research', 'skill_design_systems'], category: 'category_design', specialty: 'specialty_uiux', budget: [10000, 32000] },
  { title: 'Create Design System', skills: ['skill_figma', 'skill_design_systems', 'skill_ux_research'], category: 'category_design', specialty: 'specialty_design_systems', budget: [12000, 38000] },
  { title: 'Design Web Application UI', skills: ['skill_figma', 'skill_ux_research'], category: 'category_design', specialty: 'specialty_uiux', budget: [8000, 25000] },
  { title: 'Conduct UX Research Study', skills: ['skill_ux_research', 'skill_figma'], category: 'category_design', specialty: 'specialty_ux_research', budget: [6000, 20000] },
  // QA (6)
  { title: 'Set Up E2E Testing with Playwright', skills: ['skill_playwright', 'skill_typescript', 'skill_ci_cd'], category: 'category_quality_assurance', specialty: 'specialty_test_automation', budget: [8000, 25000] },
  { title: 'Build Cypress Test Suite', skills: ['skill_cypress', 'skill_javascript', 'skill_ci_cd'], category: 'category_quality_assurance', specialty: 'specialty_test_automation', budget: [7000, 22000] },
  { title: 'Implement API Testing Framework', skills: ['skill_postman', 'skill_rest_api', 'skill_javascript'], category: 'category_quality_assurance', specialty: 'specialty_api_testing', budget: [6000, 20000] },
  { title: 'Create Performance Testing Suite', skills: ['skill_performance_testing', 'skill_ci_cd', 'skill_linux'], category: 'category_quality_assurance', specialty: 'specialty_performance_testing', budget: [10000, 30000] },
  { title: 'Build Selenium Automation Framework', skills: ['skill_selenium', 'skill_java', 'skill_ci_cd'], category: 'category_quality_assurance', specialty: 'specialty_test_automation', budget: [8000, 25000] },
  { title: 'Develop Mobile App Testing Strategy', skills: ['skill_manual_testing', 'skill_java', 'skill_ci_cd'], category: 'category_quality_assurance', specialty: 'specialty_manual_testing', budget: [9000, 28000] },
  // Blockchain (8)
  { title: 'Develop Solidity Smart Contracts', skills: ['skill_solidity', 'skill_hardhat', 'skill_typescript'], category: 'category_blockchain', specialty: 'specialty_smart_contracts', budget: [18000, 50000] },
  { title: 'Build DeFi Protocol', skills: ['skill_solidity', 'skill_hardhat', 'skill_typescript', 'skill_react'], category: 'category_blockchain', specialty: 'specialty_defi', budget: [25000, 70000] },
  { title: 'Create NFT Marketplace', skills: ['skill_solidity', 'skill_react', 'skill_nodejs', 'skill_mongodb'], category: 'category_blockchain', specialty: 'specialty_nft', budget: [20000, 60000] },
  { title: 'Develop Web3 DApp Frontend', skills: ['skill_react', 'skill_ethersjs', 'skill_typescript'], category: 'category_blockchain', specialty: 'specialty_dapp_dev', budget: [15000, 45000] },
  { title: 'Build Cross-chain Bridge', skills: ['skill_solidity', 'skill_nodejs', 'skill_typescript'], category: 'category_blockchain', specialty: 'specialty_defi', budget: [30000, 80000] },
  { title: 'Create DAO Governance Platform', skills: ['skill_solidity', 'skill_react', 'skill_graphql'], category: 'category_blockchain', specialty: 'specialty_dapp_dev', budget: [22000, 65000] },
  { title: 'Develop Crypto Trading Bot', skills: ['skill_python', 'skill_rest_api', 'skill_postgresql'], category: 'category_blockchain', specialty: 'specialty_dapp_dev', budget: [18000, 55000] },
  { title: 'Build Blockchain Analytics Dashboard', skills: ['skill_react', 'skill_nodejs', 'skill_graphql'], category: 'category_blockchain', specialty: 'specialty_dapp_dev', budget: [16000, 48000] },
  // E-commerce (6)
  { title: 'Build Shopify Custom Theme', skills: ['skill_shopify', 'skill_javascript', 'skill_css'], category: 'category_ecommerce', specialty: 'specialty_shopify_dev', budget: [8000, 25000] },
  { title: 'Develop WooCommerce Plugin', skills: ['skill_wordpress', 'skill_php', 'skill_mysql'], category: 'category_ecommerce', specialty: 'specialty_wordpress_dev', budget: [6000, 20000] },
  { title: 'Create Headless Commerce with Strapi', skills: ['skill_strapi', 'skill_nodejs', 'skill_react'], category: 'category_ecommerce', specialty: 'specialty_headless_cms', budget: [12000, 35000] },
  { title: 'Build Magento E-commerce Store', skills: ['skill_magento', 'skill_php', 'skill_mysql'], category: 'category_ecommerce', specialty: 'specialty_wordpress_dev', budget: [10000, 30000] },
  { title: 'Develop Payment Gateway Integration', skills: ['skill_stripe', 'skill_javascript', 'skill_rest_api'], category: 'category_ecommerce', specialty: 'specialty_payment_integration', budget: [8000, 24000] },
  { title: 'Create Multi-vendor Marketplace', skills: ['skill_laravel', 'skill_vue', 'skill_mysql'], category: 'category_ecommerce', specialty: 'specialty_headless_cms', budget: [20000, 55000] },
  // Cybersecurity (6)
  { title: 'Conduct Penetration Testing', skills: ['skill_pen_testing', 'skill_linux', 'skill_python'], category: 'category_cybersecurity', specialty: 'specialty_offensive_security', budget: [12000, 38000] },
  { title: 'Implement Security Monitoring', skills: ['skill_incident_response', 'skill_linux', 'skill_python'], category: 'category_cybersecurity', specialty: 'specialty_security_operations', budget: [15000, 42000] },
  { title: 'Build Security Compliance Framework', skills: ['skill_security_compliance', 'skill_linux', 'skill_docker'], category: 'category_cybersecurity', specialty: 'specialty_grc', budget: [18000, 50000] },
  { title: 'Develop Threat Intelligence Platform', skills: ['skill_python', 'skill_elasticsearch', 'skill_linux'], category: 'category_cybersecurity', specialty: 'specialty_security_operations', budget: [20000, 55000] },
  { title: 'Create Vulnerability Assessment Tool', skills: ['skill_python', 'skill_linux', 'skill_postgresql'], category: 'category_cybersecurity', specialty: 'specialty_defensive_security', budget: [16000, 45000] },
  { title: 'Build Identity Access Management', skills: ['skill_java', 'skill_spring', 'skill_postgresql'], category: 'category_cybersecurity', specialty: 'specialty_defensive_security', budget: [22000, 60000] },
  // Game Development (6)
  { title: 'Develop Unity Mobile Game', skills: ['skill_unity', 'skill_csharp'], category: 'category_game_dev', specialty: 'specialty_unity_dev', budget: [18000, 55000] },
  { title: 'Build Unreal Engine Game', skills: ['skill_unreal', 'skill_cpp'], category: 'category_game_dev', specialty: 'specialty_unreal_dev', budget: [22000, 65000] },
  { title: 'Create VR Experience', skills: ['skill_unity', 'skill_csharp', 'skill_blender'], category: 'category_game_dev', specialty: 'specialty_vr_ar', budget: [25000, 70000] },
  { title: 'Develop AR Mobile Application', skills: ['skill_unity', 'skill_csharp', 'skill_blender'], category: 'category_game_dev', specialty: 'specialty_vr_ar', budget: [20000, 60000] },
  { title: 'Build Multiplayer Game Server', skills: ['skill_nodejs', 'skill_typescript', 'skill_redis'], category: 'category_game_dev', specialty: 'specialty_technical_art', budget: [18000, 50000] },
  { title: 'Create Game Analytics Dashboard', skills: ['skill_react', 'skill_nodejs', 'skill_mongodb'], category: 'category_game_dev', specialty: 'specialty_technical_art', budget: [15000, 42000] },
  // IoT (4)
  { title: 'Build IoT Device Management Platform', skills: ['skill_python', 'skill_mqtt', 'skill_aws'], category: 'category_iot', specialty: 'specialty_iot_dev', budget: [15000, 42000] },
  { title: 'Develop Embedded System Firmware', skills: ['skill_embedded_c', 'skill_cpp', 'skill_arduino'], category: 'category_iot', specialty: 'specialty_embedded_systems', budget: [12000, 35000] },
  { title: 'Create Smart Home Automation', skills: ['skill_python', 'skill_raspberry_pi', 'skill_mqtt'], category: 'category_iot', specialty: 'specialty_iot_dev', budget: [10000, 30000] },
  { title: 'Build Industrial IoT Solution', skills: ['skill_python', 'skill_postgresql', 'skill_mqtt'], category: 'category_iot', specialty: 'specialty_iot_cloud', budget: [20000, 55000] },
  // Technical Writing (4)
  { title: 'Write API Documentation', skills: ['skill_api_documentation', 'skill_technical_writing'], category: 'category_tech_writing', specialty: 'specialty_api_docs', budget: [5000, 18000] },
  { title: 'Create Developer Documentation', skills: ['skill_technical_writing', 'skill_git'], category: 'category_tech_writing', specialty: 'specialty_dev_docs', budget: [6000, 20000] },
  { title: 'Build Knowledge Base System', skills: ['skill_confluence', 'skill_technical_writing'], category: 'category_tech_writing', specialty: 'specialty_dev_docs', budget: [8000, 25000] },
  { title: 'Develop Training Materials', skills: ['skill_technical_writing', 'skill_git'], category: 'category_tech_writing', specialty: 'specialty_dev_docs', budget: [7000, 22000] },
]


// Freelancer Templates - DIVERSE & UNIQUE (50 templates) - Using new skills from additional-skills.ts
const FREELANCER_TEMPLATES = [
  // Frontend Specialists (12 unique combinations) - Using NEW skills
  { prefix: 'Senior React Architect', skills: ['skill_react', 'skill_typescript', 'skill_tanstack_query', 'skill_zustand', 'skill_vitest'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Vue.js Performance Expert', skills: ['skill_vue', 'skill_nuxtjs', 'skill_vite', 'skill_pinia', 'skill_vitest'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Angular Enterprise Consultant', skills: ['skill_angular', 'skill_rxjs', 'skill_ngrx', 'skill_jasmine', 'skill_karma'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Next.js E-commerce Specialist', skills: ['skill_nextjs', 'skill_stripe', 'skill_prisma', 'skill_shadcn', 'skill_vercel'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Svelte Innovation Developer', skills: ['skill_svelte', 'skill_sveltekit', 'skill_vite', 'skill_tailwind'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Frontend Accessibility Expert', skills: ['skill_react', 'skill_accessibility', 'skill_testing_library', 'skill_axe', 'skill_figma'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Progressive Web App Builder', skills: ['skill_pwa', 'skill_workbox', 'skill_lighthouse', 'skill_webpack'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Component Library Architect', skills: ['skill_storybook', 'skill_radix_ui', 'skill_stitches', 'skill_chromatic'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Micro-Frontend Specialist', skills: ['skill_module_federation', 'skill_single_spa', 'skill_webpack', 'skill_lerna'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Animation & Motion Designer', skills: ['skill_framer_motion', 'skill_gsap', 'skill_lottie', 'skill_rive'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'JAMstack Developer', skills: ['skill_astro', 'skill_eleventy', 'skill_netlify', 'skill_cloudflare'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Frontend Performance Optimizer', skills: ['skill_lighthouse', 'skill_webpack', 'skill_esbuild', 'skill_turbopack'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },

  // Backend Specialists (12 unique combinations) - Using NEW skills
  { prefix: 'Node.js Microservices Architect', skills: ['skill_nestjs', 'skill_trpc', 'skill_rabbitmq', 'skill_consul', 'skill_jaeger'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'Python AI Backend Engineer', skills: ['skill_fastapi', 'skill_celery', 'skill_sqlalchemy', 'skill_alembic', 'skill_pytest'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'Go Concurrency Expert', skills: ['skill_gin', 'skill_fiber', 'skill_gorm', 'skill_nats', 'skill_grpc'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'GraphQL API Specialist', skills: ['skill_graphql', 'skill_apollo', 'skill_hasura', 'skill_prisma', 'skill_dataloader'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'Java Enterprise Solutions Lead', skills: ['skill_spring', 'skill_quarkus', 'skill_hibernate', 'skill_kafka', 'skill_hazelcast'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'Django Scalability Engineer', skills: ['skill_django', 'skill_celery', 'skill_channels', 'skill_gunicorn', 'skill_nginx'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'Event-Driven Architecture Expert', skills: ['skill_kafka', 'skill_rabbitmq', 'skill_nats', 'skill_eventstore', 'skill_debezium'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'High-Performance API Developer', skills: ['skill_rust', 'skill_actix', 'skill_tokio', 'skill_serde', 'skill_diesel'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'Serverless Backend Specialist', skills: ['skill_aws', 'skill_lambda', 'skill_dynamodb', 'skill_sqs', 'skill_step_functions'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'Real-time Systems Engineer', skills: ['skill_socketio', 'skill_redis', 'skill_pusher', 'skill_ably'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'PHP Modern Stack Developer', skills: ['skill_laravel', 'skill_livewire', 'skill_inertia', 'skill_horizon', 'skill_vapor'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'Elixir Distributed Systems Expert', skills: ['skill_elixir', 'skill_phoenix', 'skill_ecto', 'skill_otp', 'skill_liveview'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },

  // Fullstack Engineers (8 unique combinations) - Using NEW skills
  { prefix: 'MERN Stack Architect', skills: ['skill_react', 'skill_express', 'skill_mongodb', 'skill_mongoose', 'skill_jwt'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev' },
  { prefix: 'Next.js Full-Stack Engineer', skills: ['skill_nextjs', 'skill_prisma', 'skill_planetscale', 'skill_clerk', 'skill_uploadthing'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev' },
  { prefix: 'T3 Stack Specialist', skills: ['skill_nextjs', 'skill_trpc', 'skill_drizzle', 'skill_nextauth', 'skill_zod'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev' },
  { prefix: 'Django + React Expert', skills: ['skill_django', 'skill_drf', 'skill_react', 'skill_celery', 'skill_pytest'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev' },
  { prefix: 'SaaS Platform Developer', skills: ['skill_nextjs', 'skill_stripe', 'skill_supabase', 'skill_resend', 'skill_inngest'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev' },
  { prefix: 'E-commerce Full-Stack Lead', skills: ['skill_medusa', 'skill_shopify', 'skill_saleor', 'skill_stripe', 'skill_algolia'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev' },
  { prefix: 'Remix Full-Stack Developer', skills: ['skill_remix', 'skill_fly_io', 'skill_sqlite', 'skill_tailwind', 'skill_playwright'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev' },
  { prefix: 'Headless CMS Expert', skills: ['skill_strapi', 'skill_sanity', 'skill_contentful', 'skill_graphql', 'skill_nextjs'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev' },

  // Mobile Specialists (6 unique combinations) - Using NEW skills
  { prefix: 'Flutter Cross-Platform Lead', skills: ['skill_flutter', 'skill_riverpod', 'skill_bloc', 'skill_hive', 'skill_firebase'], category: 'category_mobile_dev', specialty: 'specialty_cross_platform_mobile' },
  { prefix: 'React Native Performance Expert', skills: ['skill_react_native', 'skill_reanimated', 'skill_mmkv', 'skill_flashlist', 'skill_expo'], category: 'category_mobile_dev', specialty: 'specialty_cross_platform_mobile' },
  { prefix: 'iOS SwiftUI Specialist', skills: ['skill_swiftui', 'skill_combine', 'skill_core_data', 'skill_swift_concurrency', 'skill_xctest'], category: 'category_mobile_dev', specialty: 'specialty_native_ios' },
  { prefix: 'Android Jetpack Compose Expert', skills: ['skill_jetpack_compose', 'skill_kotlin_coroutines', 'skill_room', 'skill_hilt', 'skill_retrofit'], category: 'category_mobile_dev', specialty: 'specialty_native_android' },
  { prefix: 'Mobile DevOps Engineer', skills: ['skill_fastlane', 'skill_bitrise', 'skill_codemagic', 'skill_firebase_distribution'], category: 'category_mobile_dev', specialty: 'specialty_mobile_devops' },
  { prefix: 'Cross-Platform Desktop Developer', skills: ['skill_tauri', 'skill_electron', 'skill_rust', 'skill_typescript'], category: 'category_mobile_dev', specialty: 'specialty_cross_platform_mobile' },

  // DevOps & Cloud (6 unique combinations) - Using NEW skills
  { prefix: 'Kubernetes Platform Engineer', skills: ['skill_kubernetes', 'skill_helm', 'skill_argocd', 'skill_crossplane', 'skill_kustomize'], category: 'category_cloud_devops', specialty: 'specialty_container_platforms' },
  { prefix: 'AWS Solutions Architect', skills: ['skill_aws', 'skill_cdk', 'skill_sam', 'skill_cloudformation', 'skill_step_functions'], category: 'category_cloud_devops', specialty: 'specialty_cloud_architecture' },
  { prefix: 'Site Reliability Engineer', skills: ['skill_opentelemetry', 'skill_datadog', 'skill_pagerduty', 'skill_runbook', 'skill_chaos_engineering'], category: 'category_cloud_devops', specialty: 'specialty_sre' },
  { prefix: 'Infrastructure as Code Expert', skills: ['skill_terraform', 'skill_pulumi', 'skill_cdktf', 'skill_atlantis', 'skill_spacelift'], category: 'category_cloud_devops', specialty: 'specialty_infrastructure_code' },
  { prefix: 'GitOps Pipeline Architect', skills: ['skill_argocd', 'skill_flux', 'skill_tekton', 'skill_github_actions', 'skill_dagger'], category: 'category_cloud_devops', specialty: 'specialty_infrastructure_code' },
  { prefix: 'Service Mesh Engineer', skills: ['skill_istio', 'skill_linkerd', 'skill_envoy', 'skill_cilium', 'skill_ebpf'], category: 'category_cloud_devops', specialty: 'specialty_container_platforms' },

  // Data & AI Specialists (8 unique combinations) - Using NEW skills
  { prefix: 'MLOps Engineer', skills: ['skill_mlflow', 'skill_kubeflow', 'skill_bentoml', 'skill_seldon', 'skill_feast'], category: 'category_data', specialty: 'specialty_mlops' },
  { prefix: 'Deep Learning Researcher', skills: ['skill_pytorch', 'skill_jax', 'skill_wandb', 'skill_lightning', 'skill_hydra'], category: 'category_data', specialty: 'specialty_machine_learning' },
  { prefix: 'Data Pipeline Architect', skills: ['skill_airflow', 'skill_dagster', 'skill_prefect', 'skill_dbt', 'skill_great_expectations'], category: 'category_data', specialty: 'specialty_data_engineering' },
  { prefix: 'Computer Vision Engineer', skills: ['skill_opencv', 'skill_yolo', 'skill_detectron', 'skill_mmdetection', 'skill_albumentations'], category: 'category_data', specialty: 'specialty_machine_learning' },
  { prefix: 'LLM Application Developer', skills: ['skill_langchain', 'skill_llamaindex', 'skill_openai_api', 'skill_pinecone', 'skill_chromadb'], category: 'category_ai_ml', specialty: 'specialty_llm_apps' },
  { prefix: 'AI Agent Builder', skills: ['skill_autogen', 'skill_crewai', 'skill_semantic_kernel', 'skill_langchain', 'skill_anthropic'], category: 'category_ai_ml', specialty: 'specialty_llm_apps' },
  { prefix: 'Vector Database Specialist', skills: ['skill_pinecone', 'skill_weaviate', 'skill_qdrant', 'skill_milvus', 'skill_pgvector'], category: 'category_data', specialty: 'specialty_data_engineering' },
  { prefix: 'Business Intelligence Analyst', skills: ['skill_tableau', 'skill_looker', 'skill_metabase', 'skill_dbt', 'skill_snowflake'], category: 'category_data', specialty: 'specialty_business_intelligence' },

  // Blockchain & Web3 (6 unique combinations) - Using NEW skills
  { prefix: 'Smart Contract Auditor', skills: ['skill_solidity', 'skill_foundry', 'skill_slither', 'skill_mythril', 'skill_echidna'], category: 'category_blockchain', specialty: 'specialty_smart_contracts' },
  { prefix: 'DeFi Protocol Developer', skills: ['skill_solidity', 'skill_hardhat', 'skill_openzeppelin', 'skill_chainlink', 'skill_uniswap'], category: 'category_blockchain', specialty: 'specialty_defi' },
  { prefix: 'Web3 Frontend Developer', skills: ['skill_wagmi', 'skill_rainbowkit', 'skill_viem', 'skill_ethersjs', 'skill_thirdweb'], category: 'category_blockchain', specialty: 'specialty_dapp_dev' },
  { prefix: 'NFT Platform Builder', skills: ['skill_solidity', 'skill_ipfs', 'skill_the_graph', 'skill_opensea', 'skill_alchemy'], category: 'category_blockchain', specialty: 'specialty_nft' },
  { prefix: 'Solana Developer', skills: ['skill_rust', 'skill_anchor', 'skill_solana', 'skill_metaplex', 'skill_phantom'], category: 'category_blockchain', specialty: 'specialty_smart_contracts' },
  { prefix: 'Cross-Chain Developer', skills: ['skill_cosmos', 'skill_polkadot', 'skill_layerzero', 'skill_wormhole', 'skill_axelar'], category: 'category_blockchain', specialty: 'specialty_dapp_dev' },

  // Security Specialists (4 unique combinations) - Using NEW skills
  { prefix: 'Application Security Engineer', skills: ['skill_owasp', 'skill_burp_suite', 'skill_snyk', 'skill_sonarqube', 'skill_semgrep'], category: 'category_cybersecurity', specialty: 'specialty_application_security' },
  { prefix: 'Cloud Security Architect', skills: ['skill_aws_security', 'skill_vault', 'skill_opa', 'skill_falco', 'skill_trivy'], category: 'category_cybersecurity', specialty: 'specialty_defensive_security' },
  { prefix: 'Identity & Access Expert', skills: ['skill_keycloak', 'skill_auth0', 'skill_okta', 'skill_oauth', 'skill_saml'], category: 'category_cybersecurity', specialty: 'specialty_defensive_security' },
  { prefix: 'Penetration Tester', skills: ['skill_burp_suite', 'skill_metasploit', 'skill_nmap', 'skill_kali', 'skill_cobalt_strike'], category: 'category_cybersecurity', specialty: 'specialty_offensive_security' },

  // QA & Testing (4 unique combinations) - Using NEW skills
  { prefix: 'E2E Test Automation Lead', skills: ['skill_playwright', 'skill_cypress', 'skill_webdriverio', 'skill_allure', 'skill_percy'], category: 'category_quality_assurance', specialty: 'specialty_test_automation' },
  { prefix: 'Performance Testing Expert', skills: ['skill_k6', 'skill_gatling', 'skill_locust', 'skill_artillery', 'skill_grafana'], category: 'category_quality_assurance', specialty: 'specialty_performance_testing' },
  { prefix: 'Mobile QA Engineer', skills: ['skill_appium', 'skill_detox', 'skill_maestro', 'skill_xcuitest', 'skill_espresso'], category: 'category_quality_assurance', specialty: 'specialty_test_automation' },
  { prefix: 'API Testing Specialist', skills: ['skill_postman', 'skill_newman', 'skill_karate', 'skill_rest_assured', 'skill_pact'], category: 'category_quality_assurance', specialty: 'specialty_api_testing' },
]

const SCREENING_QUESTIONS = [
  'How many years of experience do you have with this technology?',
  'Have you worked on similar projects before?',
  'What is your availability for this project?',
  'Can you share relevant portfolio examples?',
  'What is your preferred communication style?',
  'Do you have experience with agile methodologies?',
  'Are you comfortable working in different time zones?',
  'What tools do you use for project management?',
  'Have you worked with remote teams before?',
  'Can you provide references from previous clients?',
  'What is your approach to testing and quality assurance?',
  'Do you have experience with CI/CD pipelines?',
  'How do you handle project deadlines and deliverables?',
  'What is your experience with version control systems?',
  'Are you familiar with our industry domain?',
  'Do you have any relevant certifications?',
  'What is your preferred development methodology?',
  'How do you ensure code quality and maintainability?',
  'Do you have experience with cloud platforms?',
  'What is your approach to documentation?',
]


// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedMLDiverseClients(count: number = 25): Promise<string[]> {
  const clientIds: string[] = []
  const random = seededRandom(12345)
  const companySizes = [CompanySize.JUST_ME, CompanySize.TWO_TO_NINE, CompanySize.TEN_TO_NINETY, CompanySize.HUNDRED_TO_K, CompanySize.MORE_THAN_K]

  // Company description templates for diversity
  const companyDescriptions = [
    (name: string) => `${name} is a forward-thinking technology company focused on innovation and excellence.`,
    (name: string) => `${name} specializes in cutting-edge solutions for modern businesses. We value quality and collaboration.`,
    (name: string) => `At ${name}, we build scalable products that make a difference. Join our mission to transform industries.`,
    (name: string) => `${name} is rapidly growing and looking for top talent to help us achieve our ambitious goals.`,
    (name: string) => `${name} combines technical expertise with creative vision to deliver exceptional results for our clients.`,
    (name: string) => `${name} is an established leader in our field, committed to pushing boundaries and setting new standards.`,
  ]

  for (let i = 1; i <= count; i++) {
    const firstName = pickOne(FIRST_NAMES, random)
    const lastName = pickOne(LAST_NAMES, random)
    const location = pickOne(LOCATIONS, random)
    const companyName = `${pickOne(COMPANY_NAMES, random)} ${pickOne(COMPANY_SUFFIXES, random)}`
    const companySize = pickOne(companySizes, random)
    const email = `ml.diverse.client${i}@client.test`
    const descTemplate = pickOne(companyDescriptions, random)
    const description = descTemplate(companyName)

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: TEST_PASSWORD_HASH,
        role: Role.CLIENT,
        emailVerifiedAt: VERIFIED_AT,
        isActive: true,
        profile: {
          create: {
            firstName,
            lastName,
            country: location.country,
            city: location.city,
            client: {
              create: {
                companyName,
                size: companySize,
                description
              }
            }
          }
        }
      }
    })
    clientIds.push(user.id)
  }
  return clientIds
}

async function seedMLDiverseFreelancers(count: number = 50): Promise<string[]> {
  const freelancerIds: string[] = []
  const random = seededRandom(67890)
  const allSkills = await prisma.skill.findMany({ select: { id: true } })
  const skillIds = new Set(allSkills.map(s => s.id))
  
  // Get existing categories and specialties
  const allCategories = await prisma.category.findMany({ select: { id: true } })
  const categoryIds = new Set(allCategories.map(c => c.id))
  const allSpecialties = await prisma.specialty.findMany({ select: { id: true } })
  const specialtyIds = new Set(allSpecialties.map(s => s.id))

  // Bio templates for diversity
  const bioTemplates = [
    (title: string, skills: string[], years: number) => `${title} with ${years}+ years of experience. Specialized in ${skills.slice(0, 2).join(' and ')}. Passionate about building scalable solutions.`,
    (title: string, skills: string[], years: number) => `Experienced ${title} focused on ${skills[0]?.replace('skill_', '')} and modern development practices. ${years} years in the industry.`,
    (title: string, skills: string[], years: number) => `Senior ${title} with expertise in ${skills.slice(0, 3).join(', ')}. Delivered 50+ successful projects over ${years} years.`,
    (title: string, skills: string[], years: number) => `Freelance ${title} specializing in ${skills.slice(1, 3).join(' & ')}. ${years}+ years of remote collaboration experience.`,
    (title: string, skills: string[], years: number) => `${title} passionate about ${skills[0]?.replace('skill_', '')} ecosystem. ${years} years building production-ready applications.`,
    (title: string, skills: string[], years: number) => `Full-time ${title} with deep knowledge in ${skills.slice(0, 2).join(' + ')}. ${years} years of continuous learning and innovation.`,
  ]

  for (let i = 1; i <= count; i++) {
    const template = pickOne(FREELANCER_TEMPLATES, random)
    const firstName = pickOne(FIRST_NAMES, random)
    const lastName = pickOne(LAST_NAMES, random)
    const location = pickOne(LOCATIONS, random)
    const email = `ml.diverse.freelancer${i}@freelancer.test`
    const validSkills = template.skills.filter(s => skillIds.has(s))
    const title = template.prefix // Use the full descriptive title
    const years = Math.floor(random() * 8) + 2 // 2-10 years experience
    const bioTemplate = pickOne(bioTemplates, random)
    const bio = bioTemplate(title, validSkills, years)

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: TEST_PASSWORD_HASH,
        role: Role.FREELANCER,
        emailVerifiedAt: VERIFIED_AT,
        isActive: true,
        profile: {
          create: {
            firstName,
            lastName,
            country: location.country,
            city: location.city,
            freelancer: {
              create: {
                title,
                bio
              }
            }
          }
        }
      }
    })

    // Add skills
    if (validSkills.length > 0) {
      await prisma.freelancerSkillSelection.deleteMany({ where: { userId: user.id } })
      await prisma.freelancerSkillSelection.createMany({
        data: validSkills.map((skillId, index) => ({ userId: user.id, skillId, orderHint: index }))
      })
    }

    // Add category & specialty (only if they exist)
    await prisma.freelancerCategorySelection.deleteMany({ where: { userId: user.id } })
    if (categoryIds.has(template.category)) {
      await prisma.freelancerCategorySelection.create({ data: { userId: user.id, categoryId: template.category } }).catch(() => {})
    }
    
    await prisma.freelancerSpecialtySelection.deleteMany({ where: { userId: user.id } })
    if (specialtyIds.has(template.specialty)) {
      await prisma.freelancerSpecialtySelection.create({ data: { userId: user.id, specialtyId: template.specialty } }).catch(() => {})
    }

    // Add language
    await prisma.freelancerLanguage.deleteMany({ where: { freelancerId: user.id } })
    await prisma.freelancerLanguage.create({ data: { freelancerId: user.id, languageCode: 'en', proficiency: LanguageProficiency.FLUENT } }).catch(() => {})

    freelancerIds.push(user.id)
  }
  return freelancerIds
}


async function seedMLDiverseJobs(clientIds: string[], count: number = 100): Promise<string[]> {
  const jobIds: string[] = []
  const random = seededRandom(11111)
  const allSkills = await prisma.skill.findMany({ select: { id: true } })
  const skillIds = new Set(allSkills.map(s => s.id))
  
  // Get existing specialties
  const allSpecialties = await prisma.specialty.findMany({ select: { id: true } })
  const specialtyIds = new Set(allSpecialties.map(s => s.id))
  const expLevels = [JobExperienceLevel.ENTRY, JobExperienceLevel.INTERMEDIATE, JobExperienceLevel.EXPERT]
  const locTypes = [JobLocationType.REMOTE, JobLocationType.HYBRID, JobLocationType.ON_SITE]
  const durations = [JobDurationCommitment.LESS_THAN_ONE_MONTH, JobDurationCommitment.ONE_TO_THREE_MONTHS, JobDurationCommitment.THREE_TO_SIX_MONTHS, JobDurationCommitment.MORE_THAN_SIX_MONTHS]

  // Description templates for diversity
  const descriptionTemplates = [
    (title: string, skills: string[]) => `We are seeking a talented professional to ${title.toLowerCase()}. The ideal candidate should have strong experience with ${skills.slice(0, 2).join(' and ')}. This is an exciting opportunity to work on cutting-edge technology.`,
    (title: string, skills: string[]) => `Looking for an expert to ${title.toLowerCase()}. Must be proficient in ${skills.slice(0, 3).join(', ')}. Join our innovative team and make an impact.`,
    (title: string, skills: string[]) => `${title} - We need someone who can deliver high-quality results using ${skills.slice(0, 2).join(' & ')}. Great opportunity for growth and learning.`,
    (title: string, skills: string[]) => `Exciting project alert! We're looking to ${title.toLowerCase()}. Required skills: ${skills.slice(0, 3).join(', ')}. Competitive compensation and flexible work environment.`,
    (title: string, skills: string[]) => `Join us to ${title.toLowerCase()}. We value expertise in ${skills.slice(0, 2).join(' + ')} and a passion for clean code. Long-term collaboration potential.`,
    (title: string, skills: string[]) => `${title} needed for an innovative project. Strong background in ${skills.slice(0, 3).join(', ')} required. Work with a talented international team.`,
  ]

  for (let i = 1; i <= count; i++) {
    const template = pickOne(JOB_TEMPLATES, random)
    const clientId = pickOne(clientIds, random)
    const validSkills = template.skills.filter(s => skillIds.has(s))
    const budgetMin = template.budget[0] ?? 5000
    const budgetMax = template.budget[1] ?? 20000
    const budget = budgetMin + Math.floor(random() * (budgetMax - budgetMin))
    const jobId = `ml_diverse_job_${i}`
    const descTemplate = pickOne(descriptionTemplates, random)
    const description = descTemplate(template.title, validSkills)
    
    // Use existing specialty or fallback to a default one
    const specialtyId = specialtyIds.has(template.specialty) ? template.specialty : Array.from(specialtyIds)[0]
    if (!specialtyId) continue // Skip if no specialties exist

    await prisma.jobPost.upsert({
      where: { id: jobId },
      update: {},
      create: {
        id: jobId,
        clientId,
        title: template.title,
        description,
        specialtyId,
        experienceLevel: pickOne(expLevels, random),
        locationType: pickOne(locTypes, random),
        paymentMode: JobPaymentMode.FIXED_SINGLE,
        budgetAmount: budget,
        duration: pickOne(durations, random),
        status: JobStatus.PUBLISHED,
        visibility: JobVisibility.PUBLIC,
      }
    })

    // Add skills to job
    if (validSkills.length > 0) {
      await prisma.jobRequiredSkill.deleteMany({ where: { jobId } })
      await prisma.jobRequiredSkill.createMany({
        data: validSkills.map((skillId, index) => ({ jobId, skillId, orderHint: index }))
      })
    }

    // Add screening questions
    const questions = pickRandom(SCREENING_QUESTIONS, 2, random)
    await prisma.jobScreeningQuestion.deleteMany({ where: { jobId } })
    await prisma.jobScreeningQuestion.createMany({
      data: questions.map((question, idx) => ({ jobId, question, isRequired: idx === 0 }))
    })

    // Add language requirement
    await prisma.jobLanguageRequirement.deleteMany({ where: { jobId } })
    await prisma.jobLanguageRequirement.create({
      data: { jobId, languageCode: 'en', proficiency: LanguageProficiency.FLUENT }
    }).catch(() => {})

    jobIds.push(jobId)
  }
  return jobIds
}


async function seedMLDiverseInteractions(clientIds: string[], freelancerIds: string[], jobIds: string[]): Promise<void> {
  const random = seededRandom(22222)
  const interactionTypes = [MatchInteractionType.JOB_VIEW, MatchInteractionType.PROFILE_VIEW, MatchInteractionType.PROPOSAL_SUBMITTED, MatchInteractionType.INVITATION_SENT]
  const sources = [MatchInteractionSource.SEARCH, MatchInteractionSource.RECOMMENDATION, MatchInteractionSource.DIRECT]

  let count = 0
  const maxInteractions = 500 // Reduced for quality over quantity

  for (const jobId of jobIds) {
    if (count >= maxInteractions) break
    
    // Get job's client
    const job = await prisma.jobPost.findUnique({ where: { id: jobId }, select: { clientId: true } })
    if (!job) continue

    // Create 2-5 interactions per job (more realistic)
    const numInteractions = Math.floor(random() * 4) + 2
    const selectedFreelancers = pickRandom(freelancerIds, numInteractions, random)

    for (const freelancerId of selectedFreelancers) {
      if (count >= maxInteractions) break
      count++

      const interactionType = pickOne(interactionTypes, random)
      const source = pickOne(sources, random)
      const matchScore = 0.5 + random() * 0.45

      // Get profile for the freelancer
      const profile = await prisma.profile.findUnique({ where: { userId: freelancerId } })
      if (!profile) continue

      await prisma.matchInteraction.create({
        data: {
          jobId,
          actorProfileId: profile.userId,
          clientId: job.clientId,
          freelancerId,
          type: interactionType,
          source,
          metadata: { generated: true, matchScore }
        }
      }).catch(() => {}) // Ignore duplicates

      // Create proposal for PROPOSAL_SUBMITTED
      if (interactionType === MatchInteractionType.PROPOSAL_SUBMITTED) {
        const proposalStatuses = [JobProposalStatus.SUBMITTED, JobProposalStatus.SHORTLISTED, JobProposalStatus.DECLINED]
        const coverLetters = [
          `I am excited to apply for this position. I have relevant experience and would love to contribute to your project.`,
          `Your project aligns perfectly with my expertise. I'm confident I can deliver high-quality results within your timeline.`,
          `I've worked on similar projects and understand the challenges involved. Let's discuss how I can help you succeed.`,
          `This opportunity matches my skills perfectly. I'm available to start immediately and committed to excellence.`,
          `I bring extensive experience in this domain and a track record of successful project delivery.`,
        ]
        await prisma.jobProposal.create({
          data: {
            jobId,
            freelancerId,
            coverLetter: pickOne(coverLetters, random),
            status: pickOne(proposalStatuses, random),
          }
        }).catch(() => {})
      }

      // Create invitation for INVITATION_SENT
      if (interactionType === MatchInteractionType.INVITATION_SENT) {
        const invitationStatuses = [JobInvitationStatus.SENT, JobInvitationStatus.ACCEPTED, JobInvitationStatus.DECLINED]
        const inviteMessages = [
          `We think you would be a great fit for our project. Your skills match exactly what we're looking for.`,
          `Your profile impressed us! We'd love to discuss this opportunity with you in more detail.`,
          `We have an exciting project that matches your expertise. Are you available for a quick chat?`,
          `Your experience in this area is exactly what we need. We'd like to invite you to apply.`,
          `We've reviewed your portfolio and believe you're the right person for this job. Interested?`,
        ]
        await prisma.jobInvitation.create({
          data: {
            jobId,
            clientId: job.clientId,
            freelancerId,
            message: pickOne(inviteMessages, random),
            status: pickOne(invitationStatuses, random),
          }
        }).catch(() => {})
      }
    }
  }
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export async function seedMLDiverseData(): Promise<void> {
  console.log('\n🎯 Seeding ML Diverse Data (Quality over Quantity)...\n')

  const clientIds = await runStep('Creating ML Diverse Clients (25)', () => seedMLDiverseClients(25))
  const freelancerIds = await runStep('Creating ML Diverse Freelancers (50)', () => seedMLDiverseFreelancers(50))
  const jobIds = await runStep('Creating ML Diverse Jobs (100)', () => seedMLDiverseJobs(clientIds, 100))
  await runStep('Creating ML Diverse Interactions (500)', () => seedMLDiverseInteractions(clientIds, freelancerIds, jobIds))

  console.log('\n✅ ML Diverse Data seeding completed!')
  console.log(`   - ${clientIds.length} Clients (diverse company profiles)`)
  console.log(`   - ${freelancerIds.length} Freelancers (unique titles & skills)`)
  console.log(`   - ${jobIds.length} Jobs (varied descriptions & requirements)`)
  console.log('\n📧 Test Accounts:')
  console.log('   Clients: ml.diverse.client{1-25}@client.test')
  console.log('   Freelancers: ml.diverse.freelancer{1-50}@freelancer.test')
  console.log('   Password: TestPassword!123')
  console.log('\n🎯 Focus: Quality & Diversity over Quantity')
  console.log('   - Unique freelancer titles (no more generic "X Developer")')
  console.log('   - Diverse skill combinations (minimal overlap)')
  console.log('   - Varied job descriptions & company profiles')
  console.log('   - Realistic bio & cover letter templates')
}
