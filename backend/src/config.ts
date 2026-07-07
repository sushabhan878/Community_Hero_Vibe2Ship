import dotenv from 'dotenv';
dotenv.config();

function required(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  appName: required('APP_NAME', 'Community Hero API'),
  debug: process.env.DEBUG === 'true',
  databaseUrl: required('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://'),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  supabaseJwtSecret: required('SUPABASE_JWT_SECRET'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  storageBucket: process.env.STORAGE_BUCKET ?? 'issue-media',
  storageMaxFileSize: 50 * 1024 * 1024,
  storageAllowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  storageAllowedVideoTypes: ['video/mp4'],
  expoPushApi: process.env.EXPO_PUSH_API ?? 'https://exp.host/--/api/v2/push/send',
  rateLimitIssuesPer24h: parseInt(process.env.RATE_LIMIT_ISSUES_PER_24H ?? '10', 10),
  rateLimitVerificationsPerHour: parseInt(process.env.RATE_LIMIT_VERIFICATIONS_PER_HOUR ?? '20', 10),
  verificationThreshold: parseInt(process.env.VERIFICATION_THRESHOLD ?? '5', 10),
  port: parseInt(process.env.PORT ?? '8000', 10),
};
