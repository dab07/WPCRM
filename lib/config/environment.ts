// Environment configuration
export const config = {
  zavopsai : {
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
  },
  

  n8n: {
    baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
    apiKey: process.env.NEXT_PUBLIC_N8N_API_KEY!,
    authEnabled: process.env.N8N_API_KEY_AUTH_ENABLED === 'true',
  },
  

  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    provider: process.env.WHATSAPP_PROVIDER || 'meta',
  },
  

  instagram: {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
    userId: process.env.INSTAGRAM_USER_ID,
    webhookVerifyToken: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
  },


  shopify: {
    shopDomain: process.env.SHOPIFY_SHOP_DOMAIN ?? '',
    clientId: process.env.SHOPIFY_CLIENT_ID ?? '',
    clientSecret: process.env.SHOPIFY_SECRET ?? '',
  },

  klaviyo: {
    apiKey: process.env.KLAVIYO_API_KEY ?? '',
  },

  omnisend: {
    apiKey: process.env.OMNISEND_API_KEY ?? '',
  },

  metaAds: {
    accessToken: process.env.META_ADS_ACCESS_TOKEN ?? '',
    adAccountId: process.env.META_ADS_ACCOUNT_ID ?? '',
    apiVersion: process.env.META_ADS_API_VERSION ?? 'v19.0',
  },

  app: {
    environment: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },
} as const;

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'GEMINI_API_KEY',
  'NEXT_PUBLIC_N8N_API_KEY',
];

const optionalEnvVars = [
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'INSTAGRAM_ACCESS_TOKEN',
  'INSTAGRAM_USER_ID',
];

export const validateEnvironment = (): void => {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
  
  const missingOptional = optionalEnvVars.filter(key => !process.env[key]);
  if (missingOptional.length > 0 && config.app.isDevelopment) {
    console.warn(
      `Optional environment variables not set: ${missingOptional.join(', ')}`
    );
  }
};