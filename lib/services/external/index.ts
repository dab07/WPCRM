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
  detectIntent
} from './GeminiService';



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



// Note: CampaignImageService types are server-only
// Import directly from './CampaignImageService' in API routes

// [NEW: brand-sync + campaign-execution] — added 2026-04-11
export { ShopifyService, ShopifyServiceError } from './ShopifyService';
export type { ShopifyCustomer, ShopifyOrder, ShopifySyncResult } from './ShopifyService';

export { KlaviyoService, KlaviyoServiceError } from './KlaviyoService';
export type { KlaviyoList, KlaviyoFlow, KlaviyoMetric, KlaviyoCampaignResult, KlaviyoSyncResult } from './KlaviyoService';

export { OmnisendService, OmnisendServiceError } from './OmnisendService';
export type { OmnisendContact, OmnisendCampaign, OmnisendMetrics, OmnisendSyncResult } from './OmnisendService';

export { MetaAdsService, MetaAdsServiceError } from './MetaAdsService';
export type { MetaCustomAudience, MetaAudienceSyncParams, MetaAdSet } from './MetaAdsService';