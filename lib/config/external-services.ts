// External service configuration
export const externalServicesConfig = {
  // Gemini AI
  gemini: {
    model: 'gemini-2.5-flash',
    maxTokens: 1000,
    temperature: 0.7,
    timeout: 30000,
    retries: 3,
  },
  
  // N8N
  n8n: {
    timeout: 60000,
    retries: 2,
    webhookTimeout: 30000,
  },
  
  // WhatsApp Business API
  whatsapp: {
    apiVersion: 'v18.0',
    timeout: 30000,
    retries: 3,
    maxMessageLength: 4096,
  },
  
  // Instagram API
  instagram: {
    timeout: 30000,
    retries: 2,
    maxPostsPerRequest: 25,
  },
  
  // Rate limiting
  rateLimits: {
    gemini: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
    whatsapp: {
      requestsPerSecond: 10,
      requestsPerMinute: 600,
    },
    n8n: {
      requestsPerMinute: 100,
    },
    instagram: {
      requestsPerHour: 200,
    },
  },
  
  // Error handling
  errorHandling: {
    maxRetryDelay: 30000, // 30 seconds
    baseRetryDelay: 1000, // 1 second
    exponentialBackoff: true,
    logErrors: true,
  },
} as const;