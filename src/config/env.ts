import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().default('AdminDB'),
  MONGODB_SUPPORT_DB_NAME: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_CLERK_IS_SATELLITE: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().optional(),
  CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string().default('/dashboard'),
  ADMIN_INVITE_REDIRECT_URL: z.string().url().optional(),
  ADMIN_FROM_EMAIL: z.string().email().optional(),
  ADMIN_INIT_SECRET: z.string().optional(),
  ADMIN_DEV_BYPASS_KEY: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  ADMIN_MAILBOX_IMAP_USER: z.string().optional(),
  ADMIN_MAILBOX_IMAP_PASSWORD: z.string().optional(),
  ADMIN_MAILBOX_IMAP_HOST: z.string().default('imap.gmail.com'),
  ADMIN_MAILBOX_IMAP_PORT: z.coerce.number().default(993),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CLOUD_RUN_BASE_URL: z.string().optional(),
  CLOUD_RUN_API_TOKEN: z.string().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  GOOGLE_ANALYTICS_PROPERTY_ID: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  ADMIN_LIMIT_GA_MONTHLY_EVENTS: z.coerce.number().optional(),
  ADMIN_LIMIT_RAZORPAY_MONTHLY_TXNS: z.coerce.number().optional(),
  ADMIN_LIMIT_BREVO_MONTHLY_EMAILS: z.coerce.number().optional(),
  ADMIN_LIMIT_SUPPORT_OPEN_TICKETS: z.coerce.number().optional(),
  ADMIN_LIMIT_CONTACT_OPEN_REQUESTS: z.coerce.number().optional(),
  ADMIN_NOTIFICATION_RETENTION_DAYS: z.coerce.number().default(14),
  ADMIN_BOOTSTRAP_CLERK_USER_ID: z.string().optional(),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export function getEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  if (parsed.data.NODE_ENV === 'production') {
    if (!parsed.data.CLERK_SECRET_KEY || !parsed.data.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      throw new Error('Invalid environment configuration: Clerk keys are required in production');
    }
  }

  return parsed.data;
}
