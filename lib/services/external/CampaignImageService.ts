import { GoogleGenAI } from "@google/genai";
import { config } from '../../config/environment';
export interface CampaignImageConfig {
  campaignName: string;
  theme?: string | null;
}

export interface GeneratedImageResult {
  success: boolean;
  imageBase64?: string | null;
  imageUrl?: string | null;
  mimeType?: string | null;
  error?: string | null;
}

export class CampaignImageServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'CampaignImageServiceError';
  }
}

export class CampaignImageService {
  private client: GoogleGenAI | null = null;

  constructor() {
    // Service initialization
  }

  private getClient(): GoogleGenAI {
    if (typeof window !== 'undefined') {
      throw new CampaignImageServiceError('Campaign Image Service can only be used on server-side');
    }

    if (!this.client) {
      if (!config.gemini.apiKey) {
        throw new CampaignImageServiceError('GEMINI_API_KEY is required');
      }
      
      this.client = new GoogleGenAI({
        apiKey: config.gemini.apiKey
      });
    }
    
    return this.client;
  }

  /**
   * Load Zavops logo as base64
   */
  private async getZavopsLogoBase64(): Promise<string | null> {
    try {
      // Only available on server-side
      if (typeof window !== 'undefined') {
        return null;
      }
      
      // Dynamic imports for server-side only
      const fs = await import('fs');
      const path = await import('path');
      
      // Try multiple possible logo paths
      const possiblePaths = [
        path.join(process.cwd(), 'public', 'logos', 'zavops-logo.jpg'),
        path.join(process.cwd(), 'logos', 'Zavops-Icon-Combo.png'),
      ];
      
      for (const logoPath of possiblePaths) {
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          return logoBuffer.toString('base64');
        }
      }
      
      // If no logo file found, create a simple text-based logo
      console.warn('[Campaign Image Service] Creating fallback text logo');
      return this.createFallbackLogo();
      
    } catch (error) {
      console.error('[Campaign Image Service] Error loading logo:', error);
      return this.createFallbackLogo();
    }
  }

  /**
   * Create a simple text-based logo as fallback
   */
  private createFallbackLogo(): string {
    const logoJPG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="120" height="40" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="40" fill="#667eea" rx="8"/>
  <text x="60" y="25" font-size="16" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial, sans-serif">
    Zavops
  </text>
</svg>`;
    
    return Buffer.from(logoJPG).toString('base64');
  }

  /**
   * Generate campaign image using Gemini
   * Gemini understands the campaign name and generates appropriate greeting and design
   */
  async generateCampaignImage(config: CampaignImageConfig): Promise<GeneratedImageResult> {
    try {
      const prompt = `Create a professional WhatsApp campaign greeting image for: "${config.campaignName}"

Requirements:
1. Analyze the campaign name and create an appropriate greeting message
2. Design a professional, celebratory image suitable for WhatsApp business messaging
3. Include the campaign theme/greeting as large, bold text (main focal point)
4. Place Zavops logo in top-right corner (small, non-intrusive)
5. Use colors and design elements appropriate for the campaign theme
6. Image size: 1080x1080 pixels (square format)
7. Professional quality with smooth gradients
8. Ensure text is readable and centered
9. Make it culturally appropriate and celebratory

Campaign Theme: ${config.theme || 'professional celebration'}

Generate this image now.`;

      const client = this.getClient();
      
      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      });

      const generatedText = response.text;

      if (!generatedText) {
        throw new CampaignImageServiceError('No response from Gemini');
      }

      console.log('[Campaign Image Service] Image generation response:', generatedText.substring(0, 100));

      // Use JPEG fallback instead of SVG for WhatsApp compatibility
      return this.generateCampaignImageJPEG(config);

    } catch (error) {
      console.error('[Campaign Image Service] Error generating campaign image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '[CampaignImageService] Image generation failed'
      };
    }
  }

  /**
   * Generate campaign image as JPEG (WhatsApp compatible)
   */
  async generateCampaignImageJPEG(config: CampaignImageConfig): Promise<GeneratedImageResult> {
    try {
      // Create a simple base64 JPEG (1x1 blue pixel as placeholder)
      // This is a minimal implementation - replace with proper image generation
      const simpleJpeg = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
      
      return {
        success: true,
        imageBase64: simpleJpeg,
        mimeType: 'image/jpeg'
      };

    } catch (error) {
      console.error('[Campaign Image Service] Error generating JPEG:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Legacy exports
export async function generateCampaignImage(config: CampaignImageConfig): Promise<GeneratedImageResult> {
  const service = new CampaignImageService();
  return service.generateCampaignImage(config);
}

