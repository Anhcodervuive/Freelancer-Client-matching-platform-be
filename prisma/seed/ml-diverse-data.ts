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


// Freelancer Templates - 60+ diverse templates
const FREELANCER_TEMPLATES = [
  // Frontend (6)
  { prefix: 'React', skills: ['skill_react', 'skill_typescript', 'skill_css', 'skill_tailwind', 'skill_redux'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Vue.js', skills: ['skill_vue', 'skill_typescript', 'skill_css', 'skill_nuxtjs'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Angular', skills: ['skill_angular', 'skill_typescript', 'skill_css', 'skill_sass', 'skill_graphql'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Next.js', skills: ['skill_nextjs', 'skill_react', 'skill_typescript', 'skill_tailwind', 'skill_prisma'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Svelte', skills: ['skill_svelte', 'skill_typescript', 'skill_css', 'skill_rest_api'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  { prefix: 'Frontend UI/UX', skills: ['skill_react', 'skill_css', 'skill_tailwind', 'skill_figma', 'skill_storybook'], category: 'category_web_dev', specialty: 'specialty_frontend_dev' },
  // Backend (6)
  { prefix: 'Node.js', skills: ['skill_nodejs', 'skill_express', 'skill_postgresql', 'skill_typescript', 'skill_redis'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'Python', skills: ['skill_python', 'skill_fastapi', 'skill_postgresql', 'skill_rest_api', 'skill_docker'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'Go', skills: ['skill_golang', 'skill_postgresql', 'skill_docker', 'skill_kubernetes', 'skill_redis'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'NestJS', skills: ['skill_nestjs', 'skill_typescript', 'skill_postgresql', 'skill_docker', 'skill_graphql'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'Java Spring', skills: ['skill_java', 'skill_spring', 'skill_postgresql', 'skill_docker', 'skill_rest_api'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  { prefix: 'Django', skills: ['skill_python', 'skill_django', 'skill_postgresql', 'skill_rest_api', 'skill_docker'], category: 'category_web_dev', specialty: 'specialty_backend_dev' },
  // Fullstack (4)
  { prefix: 'Full-Stack JavaScript', skills: ['skill_react', 'skill_nodejs', 'skill_typescript', 'skill_postgresql', 'skill_tailwind'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev' },
  { prefix: 'MERN Stack', skills: ['skill_react', 'skill_nodejs', 'skill_mongodb', 'skill_express', 'skill_typescript'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev' },
  { prefix: 'Next.js Full-Stack', skills: ['skill_nextjs', 'skill_typescript', 'skill_postgresql', 'skill_prisma', 'skill_tailwind'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev' },
  { prefix: 'Python Full-Stack', skills: ['skill_python', 'skill_django', 'skill_react', 'skill_postgresql', 'skill_docker'], category: 'category_web_dev', specialty: 'specialty_fullstack_dev' },
  // Mobile (4)
  { prefix: 'Flutter', skills: ['skill_flutter', 'skill_rest_api', 'skill_firebase'], category: 'category_mobile_dev', specialty: 'specialty_cross_platform_mobile' },
  { prefix: 'React Native', skills: ['skill_react_native', 'skill_typescript', 'skill_rest_api', 'skill_redux'], category: 'category_mobile_dev', specialty: 'specialty_cross_platform_mobile' },
  { prefix: 'iOS Swift', skills: ['skill_swift', 'skill_ios', 'skill_rest_api', 'skill_ci_cd'], category: 'category_mobile_dev', specialty: 'specialty_native_ios' },
  { prefix: 'Android Kotlin', skills: ['skill_kotlin', 'skill_android', 'skill_rest_api', 'skill_firebase'], category: 'category_mobile_dev', specialty: 'specialty_native_android' },
  // DevOps (4)
  { prefix: 'DevOps', skills: ['skill_docker', 'skill_kubernetes', 'skill_ci_cd', 'skill_linux', 'skill_terraform'], category: 'category_cloud_devops', specialty: 'specialty_infrastructure_code' },
  { prefix: 'AWS Cloud', skills: ['skill_aws', 'skill_terraform', 'skill_docker', 'skill_linux', 'skill_kubernetes'], category: 'category_cloud_devops', specialty: 'specialty_cloud_architecture' },
  { prefix: 'Kubernetes', skills: ['skill_kubernetes', 'skill_docker', 'skill_linux', 'skill_ci_cd'], category: 'category_cloud_devops', specialty: 'specialty_container_platforms' },
  { prefix: 'SRE', skills: ['skill_observability', 'skill_linux', 'skill_docker', 'skill_kubernetes'], category: 'category_cloud_devops', specialty: 'specialty_sre' },
  // Data/ML (4)
  { prefix: 'Machine Learning', skills: ['skill_python', 'skill_scikit', 'skill_pandas', 'skill_tensorflow', 'skill_numpy'], category: 'category_data', specialty: 'specialty_machine_learning' },
  { prefix: 'Deep Learning', skills: ['skill_python', 'skill_pytorch', 'skill_tensorflow', 'skill_pandas'], category: 'category_data', specialty: 'specialty_machine_learning' },
  { prefix: 'Data Engineer', skills: ['skill_python', 'skill_sql', 'skill_airflow', 'skill_postgresql', 'skill_docker'], category: 'category_data', specialty: 'specialty_data_engineering' },
  { prefix: 'Data Scientist', skills: ['skill_python', 'skill_pandas', 'skill_scikit', 'skill_tableau', 'skill_sql'], category: 'category_data', specialty: 'specialty_business_intelligence' },
  // Design (2)
  { prefix: 'UI/UX', skills: ['skill_figma', 'skill_ux_research', 'skill_design_systems'], category: 'category_design', specialty: 'specialty_uiux' },
  { prefix: 'Product Designer', skills: ['skill_figma', 'skill_design_systems', 'skill_ux_research'], category: 'category_design', specialty: 'specialty_design_systems' },
  // QA (4)
  { prefix: 'QA Automation', skills: ['skill_playwright', 'skill_typescript', 'skill_ci_cd', 'skill_jest'], category: 'category_quality_assurance', specialty: 'specialty_test_automation' },
  { prefix: 'Test Engineer', skills: ['skill_cypress', 'skill_javascript', 'skill_ci_cd'], category: 'category_quality_assurance', specialty: 'specialty_test_automation' },
  { prefix: 'Performance Testing', skills: ['skill_performance_testing', 'skill_ci_cd', 'skill_linux'], category: 'category_quality_assurance', specialty: 'specialty_performance_testing' },
  { prefix: 'API Testing', skills: ['skill_postman', 'skill_rest_api', 'skill_javascript'], category: 'category_quality_assurance', specialty: 'specialty_api_testing' },
  // Blockchain (6)
  { prefix: 'Solidity', skills: ['skill_solidity', 'skill_hardhat', 'skill_typescript'], category: 'category_blockchain', specialty: 'specialty_smart_contracts' },
  { prefix: 'Web3', skills: ['skill_react', 'skill_ethersjs', 'skill_typescript', 'skill_solidity'], category: 'category_blockchain', specialty: 'specialty_dapp_dev' },
  { prefix: 'DeFi', skills: ['skill_solidity', 'skill_hardhat', 'skill_typescript', 'skill_react'], category: 'category_blockchain', specialty: 'specialty_defi' },
  { prefix: 'NFT', skills: ['skill_solidity', 'skill_react', 'skill_nodejs', 'skill_mongodb'], category: 'category_blockchain', specialty: 'specialty_nft' },
  { prefix: 'Crypto Trading', skills: ['skill_python', 'skill_rest_api', 'skill_postgresql'], category: 'category_blockchain', specialty: 'specialty_dapp_dev' },
  { prefix: 'Blockchain Analytics', skills: ['skill_react', 'skill_nodejs', 'skill_graphql'], category: 'category_blockchain', specialty: 'specialty_dapp_dev' },
  // E-commerce (4)
  { prefix: 'Shopify', skills: ['skill_shopify', 'skill_javascript', 'skill_css'], category: 'category_ecommerce', specialty: 'specialty_shopify_dev' },
  { prefix: 'WordPress', skills: ['skill_wordpress', 'skill_php', 'skill_mysql'], category: 'category_ecommerce', specialty: 'specialty_wordpress_dev' },
  { prefix: 'Magento', skills: ['skill_magento', 'skill_php', 'skill_mysql'], category: 'category_ecommerce', specialty: 'specialty_wordpress_dev' },
  { prefix: 'Headless Commerce', skills: ['skill_strapi', 'skill_nodejs', 'skill_react'], category: 'category_ecommerce', specialty: 'specialty_headless_cms' },
  // Cybersecurity (4)
  { prefix: 'Security', skills: ['skill_pen_testing', 'skill_linux', 'skill_python'], category: 'category_cybersecurity', specialty: 'specialty_offensive_security' },
  { prefix: 'Security Operations', skills: ['skill_incident_response', 'skill_linux', 'skill_python'], category: 'category_cybersecurity', specialty: 'specialty_security_operations' },
  { prefix: 'Compliance', skills: ['skill_security_compliance', 'skill_linux', 'skill_docker'], category: 'category_cybersecurity', specialty: 'specialty_grc' },
  { prefix: 'Threat Intelligence', skills: ['skill_python', 'skill_elasticsearch', 'skill_linux'], category: 'category_cybersecurity', specialty: 'specialty_security_operations' },
  // Game Development (4)
  { prefix: 'Unity', skills: ['skill_unity', 'skill_csharp'], category: 'category_game_dev', specialty: 'specialty_unity_dev' },
  { prefix: 'Unreal', skills: ['skill_unreal', 'skill_cpp'], category: 'category_game_dev', specialty: 'specialty_unreal_dev' },
  { prefix: 'VR/AR', skills: ['skill_unity', 'skill_csharp', 'skill_blender'], category: 'category_game_dev', specialty: 'specialty_vr_ar' },
  { prefix: 'Game Backend', skills: ['skill_nodejs', 'skill_typescript', 'skill_redis'], category: 'category_game_dev', specialty: 'specialty_technical_art' },
  // IoT (2)
  { prefix: 'IoT', skills: ['skill_python', 'skill_mqtt', 'skill_aws'], category: 'category_iot', specialty: 'specialty_iot_dev' },
  { prefix: 'Embedded Systems', skills: ['skill_embedded_c', 'skill_cpp', 'skill_arduino'], category: 'category_iot', specialty: 'specialty_embedded_systems' },
  // Technical Writing (2)
  { prefix: 'Technical Writer', skills: ['skill_api_documentation', 'skill_technical_writing'], category: 'category_tech_writing', specialty: 'specialty_api_docs' },
  { prefix: 'Documentation Specialist', skills: ['skill_technical_writing', 'skill_git'], category: 'category_tech_writing', specialty: 'specialty_dev_docs' },
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

async function seedMLDiverseClients(count: number = 50): Promise<string[]> {
  const clientIds: string[] = []
  const random = seededRandom(12345)
  const companySizes = [CompanySize.JUST_ME, CompanySize.TWO_TO_NINE, CompanySize.TEN_TO_NINETY, CompanySize.HUNDRED_TO_K, CompanySize.MORE_THAN_K]

  for (let i = 1; i <= count; i++) {
    const firstName = pickOne(FIRST_NAMES, random)
    const lastName = pickOne(LAST_NAMES, random)
    const location = pickOne(LOCATIONS, random)
    const companyName = `${pickOne(COMPANY_NAMES, random)} ${pickOne(COMPANY_SUFFIXES, random)}`
    const companySize = pickOne(companySizes, random)
    const email = `ml.diverse.client${i}@client.test`

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
                description: `${companyName} is looking for talented freelancers.`
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

async function seedMLDiverseFreelancers(count: number = 150): Promise<string[]> {
  const freelancerIds: string[] = []
  const random = seededRandom(67890)
  const allSkills = await prisma.skill.findMany({ select: { id: true } })
  const skillIds = new Set(allSkills.map(s => s.id))
  
  // Get existing categories and specialties
  const allCategories = await prisma.category.findMany({ select: { id: true } })
  const categoryIds = new Set(allCategories.map(c => c.id))
  const allSpecialties = await prisma.specialty.findMany({ select: { id: true } })
  const specialtyIds = new Set(allSpecialties.map(s => s.id))

  for (let i = 1; i <= count; i++) {
    const template = pickOne(FREELANCER_TEMPLATES, random)
    const firstName = pickOne(FIRST_NAMES, random)
    const lastName = pickOne(LAST_NAMES, random)
    const location = pickOne(LOCATIONS, random)
    const email = `ml.diverse.freelancer${i}@freelancer.test`
    const validSkills = template.skills.filter(s => skillIds.has(s))
    const title = `${template.prefix} Developer`

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
                bio: `Experienced ${template.prefix} developer with expertise in ${validSkills.slice(0, 2).join(', ')}.`
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


async function seedMLDiverseJobs(clientIds: string[], count: number = 200): Promise<string[]> {
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

  for (let i = 1; i <= count; i++) {
    const template = pickOne(JOB_TEMPLATES, random)
    const clientId = pickOne(clientIds, random)
    const validSkills = template.skills.filter(s => skillIds.has(s))
    const budgetMin = template.budget[0] ?? 5000
    const budgetMax = template.budget[1] ?? 20000
    const budget = budgetMin + Math.floor(random() * (budgetMax - budgetMin))
    const jobId = `ml_diverse_job_${i}`
    
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
        description: `We are looking for an experienced developer to ${template.title.toLowerCase()}. This is a great opportunity to work on an exciting project.`,
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
  const maxInteractions = 2000

  for (const jobId of jobIds) {
    if (count >= maxInteractions) break
    
    // Get job's client
    const job = await prisma.jobPost.findUnique({ where: { id: jobId }, select: { clientId: true } })
    if (!job) continue

    // Create 1-3 interactions per job
    const numInteractions = Math.floor(random() * 3) + 1
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
        await prisma.jobProposal.create({
          data: {
            jobId,
            freelancerId,
            coverLetter: `I am excited to apply for this position. I have relevant experience and skills.`,
            status: pickOne(proposalStatuses, random),
          }
        }).catch(() => {})
      }

      // Create invitation for INVITATION_SENT
      if (interactionType === MatchInteractionType.INVITATION_SENT) {
        const invitationStatuses = [JobInvitationStatus.SENT, JobInvitationStatus.ACCEPTED, JobInvitationStatus.DECLINED]
        await prisma.jobInvitation.create({
          data: {
            jobId,
            clientId: job.clientId,
            freelancerId,
            message: `We think you would be a great fit for our project.`,
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
  console.log('\n🎯 Seeding ML Diverse Data...\n')

  const clientIds = await runStep('Creating ML Diverse Clients (200)', () => seedMLDiverseClients(200))
  const freelancerIds = await runStep('Creating ML Diverse Freelancers (500)', () => seedMLDiverseFreelancers(500))
  const jobIds = await runStep('Creating ML Diverse Jobs (800)', () => seedMLDiverseJobs(clientIds, 800))
  await runStep('Creating ML Diverse Interactions (2000)', () => seedMLDiverseInteractions(clientIds, freelancerIds, jobIds))

  console.log('\n✅ ML Diverse Data seeding completed!')
  console.log(`   - ${clientIds.length} Clients`)
  console.log(`   - ${freelancerIds.length} Freelancers`)
  console.log(`   - ${jobIds.length} Jobs`)
  console.log('\n📧 Test Accounts:')
  console.log('   Clients: ml.diverse.client{1-200}@client.test')
  console.log('   Freelancers: ml.diverse.freelancer{1-500}@freelancer.test')
  console.log('   Password: TestPassword!123')
}
