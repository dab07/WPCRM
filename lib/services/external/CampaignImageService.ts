import fs from 'fs';
import path from 'path';
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

// Load logo once at module level — this file is only ever used server-side
function loadLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'logos', 'Zavops logo full (1).png');
    return fs.readFileSync(logoPath).toString('base64');
  } catch {
    console.warn('[CampaignImageService] Could not load Zavops logo, generating without it');
    return null;
  }
}

const ZAVOPS_LOGO_BASE64 = loadLogoBase64();

export class CampaignImageService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  async generateCampaignImage(config: CampaignImageConfig): Promise<GeneratedImageResult> {
    try {
      const result = await this.geminiService.generateCampaignImage({
        ...config,
        logoBase64: ZAVOPS_LOGO_BASE64,
      });

      if (result.success && result.data) {
        return {
          success: true,
          imageBase64: result.data.imageBase64,
          mimeType: result.data.mimeType,
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to generate image',
      };
    } catch (error) {
      console.error('[Campaign Image Service] Error generating campaign image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /** @deprecated use generateCampaignImage */
  async generateCampaignImageSVG(config: CampaignImageConfig): Promise<GeneratedImageResult> {
    return this.generateCampaignImage(config);
  }
}

export async function generateCampaignImage(config: CampaignImageConfig): Promise<GeneratedImageResult> {
  const service = new CampaignImageService();
  return service.generateCampaignImage(config);
}
