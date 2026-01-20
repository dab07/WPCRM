// External services exports
export * from './types';

// Service classes
export { 
  WhatsAppService, 
  WhatsAppServiceError, 
  createWhatsAppService,
  sendWhatsAppMessage,
  sendWelcomeMessage,
  sendTemplateMessage,
  markMessageAsRead
} from './WhatsAppService';

export { 
  GeminiService, 
  GeminiServiceError,
  extractBusinessCardFromText,
  extractBusinessCardFromImage,
  generateAIResponse,
  generateInstagramMessage,
  detectIntent
} from './GeminiService';

export { 
  InstagramService, 
  InstagramServiceError,
  fetchInstagramPosts,
  storeInstagramPost,
  getBroadcastRules,
  getTargetContacts,
  matchesHashtagFilters,
  logBroadcast
} from './InstagramService';

// Note: CampaignImageService is server-only and should be imported directly
// from './CampaignImageService' in API routes only

// Type exports
export type { 
  WhatsAppConfig, 
  SendMessageParams, 
  SendMessageResult 
} from './WhatsAppService';

export type { 
  BusinessCardData, 
  GeminiResponse 
} from './GeminiService';

export type { 
  InstagramPost, 
  InstagramBroadcastRule 
} from './InstagramService';

// Note: CampaignImageService types are server-only
// Import directly from './CampaignImageService' in API routes