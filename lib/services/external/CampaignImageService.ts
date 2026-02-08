import { GeminiService } from './GeminiService';

export interface CampaignImageConfig {
  campaignName: string;
  theme?: string | null;
}

export interface GeneratedImageResult {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  error?: string;
}

export class CampaignImageServiceError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'CampaignImageServiceError';
  }
}

export class CampaignImageService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * Generate campaign image using Gemini Imagen
   * Returns PNG image suitable for WhatsApp
   */
  async generateCampaignImage(config: CampaignImageConfig): Promise<GeneratedImageResult> {
    try {
      const result = await this.geminiService.generateCampaignImage(config);
      
      if (result.success && result.data) {
        return {
          success: true,
          imageBase64: result.data.imageBase64,
          mimeType: result.data.mimeType
        };
      }
      
      return {
        success: false,
        error: result.error || 'Failed to generate image'
      };
    } catch (error) {
      console.error('[Campaign Image Service] Error generating campaign image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Alias for backward compatibility
   */
  async generateCampaignImageSVG(config: CampaignImageConfig): Promise<GeneratedImageResult> {
    return this.generateCampaignImage(config);
  }
}

// Legacy exports for backward compatibility
export async function generateCampaignImage(config: CampaignImageConfig): Promise<GeneratedImageResult> {
  const service = new CampaignImageService();
  return service.generateCampaignImage(config);
}
