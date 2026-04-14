/*
  Production environment verifier for admin.loanpro.tech deployment.
  Usage:
    node ./scripts/verify-production-env.mjs
*/

const requiredCore = [
  'NODE_ENV',
  'NEXT_PUBLIC_APP_URL',
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'ADMIN_INIT_SECRET',
  'ADMIN_INVITE_REDIRECT_URL',
];

const requiredAtLeastOne = ['ADMIN_BOOTSTRAP_CLERK_USER_ID', 'ADMIN_BOOTSTRAP_EMAIL'];

const recommendedIntegrations = [
  'BREVO_API_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'CLOUD_RUN_BASE_URL',
  'CLOUD_RUN_API_TOKEN',
  'GITHUB_TOKEN',
  'GITHUB_RELEASE_OWNER',
  'GITHUB_RELEASE_REPO',
  'NEXT_PUBLIC_GA_MEASUREMENT_ID',
];

const recommendedUsage = [
  'GOOGLE_ANALYTICS_PROPERTY_ID',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'ADMIN_LIMIT_GA_MONTHLY_EVENTS',
  'ADMIN_LIMIT_RAZORPAY_MONTHLY_TXNS',
  'ADMIN_LIMIT_BREVO_MONTHLY_EMAILS',
  'ADMIN_LIMIT_SUPPORT_OPEN_TICKETS',
  'ADMIN_LIMIT_CONTACT_OPEN_REQUESTS',
];

function hasValue(name) {
  return String(process.env[name] || '').trim().length > 0;
}

function printList(title, list) {
  console.log(`\n${title}`);
  for (const item of list) {
    console.log(`- ${item}`);
  }
}

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exitCode = 1;
}

console.log('LoanPro Admin Production Environment Verification');

if (!hasValue('NODE_ENV')) {
  fail('NODE_ENV is missing. It must be set to production in Vercel.');
} else if (String(process.env.NODE_ENV).trim() !== 'production') {
  fail(`NODE_ENV must be production. Current value: ${process.env.NODE_ENV}`);
}

if (hasValue('ADMIN_DEV_BYPASS_KEY')) {
  fail('ADMIN_DEV_BYPASS_KEY is set. Remove it from production environment.');
}

const missingRequired = requiredCore.filter((name) => !hasValue(name));
if (missingRequired.length > 0) {
  printList('Missing required variables:', missingRequired);
  process.exitCode = 1;
}

if (!requiredAtLeastOne.some((name) => hasValue(name))) {
  fail('At least one bootstrap variable is required: ADMIN_BOOTSTRAP_CLERK_USER_ID or ADMIN_BOOTSTRAP_EMAIL');
}

const missingRecommendedIntegrations = recommendedIntegrations.filter((name) => !hasValue(name));
const missingRecommendedUsage = recommendedUsage.filter((name) => !hasValue(name));

if (missingRecommendedIntegrations.length > 0) {
  printList('Recommended integration variables missing (non-blocking):', missingRecommendedIntegrations);
}

if (missingRecommendedUsage.length > 0) {
  printList('Recommended usage/limit variables missing (non-blocking):', missingRecommendedUsage);
}

if (!process.exitCode) {
  console.log('\nOK: Required production environment variables are present.');
}
