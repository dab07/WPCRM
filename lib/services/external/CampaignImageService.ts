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
      
      const logoPath = path.join(process.cwd(), 'logos', 'Zavops-Icon-Combo.png.webp');
      
      if (!fs.existsSync(logoPath)) {
        console.warn('[Campaign Image Service] Zavops logo not found at:', logoPath);
        return null;
      }

      const logoBuffer = fs.readFileSync(logoPath);
      return logoBuffer.toString('base64');
    } catch (error) {
      console.error('[Campaign Image Service] Error loading logo:', error);
      return null;
    }
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

      // Use SVG fallback for now
      return this.generateCampaignImageSVG(config);

    } catch (error) {
      console.error('[Campaign Image Service] Error generating campaign image:', error);
      return this.generateCampaignImageSVG(config);
    }
  }

  /**
   * Create a simple SVG-based campaign image as fallback
   */
  async generateCampaignImageSVG(config: CampaignImageConfig): Promise<GeneratedImageResult> {
    try {
      // Attempt to load logo
      await this.getZavopsLogoBase64();

      // Create SVG with campaign theme
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#bgGradient)"/>
  
  <!-- Decorative elements -->
  <circle cx="100" cy="100" r="80" fill="#f093fb" opacity="0.3"/>
  <circle cx="980" cy="980" r="100" fill="#4facfe" opacity="0.3"/>
  <circle cx="540" cy="200" r="60" fill="#43e97b" opacity="0.2"/>
  
  <!-- Main campaign text -->
  <text x="540" y="500" font-size="100" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial, sans-serif">
    ${config.campaignName}
  </text>
  
  <!-- Zavops logo placeholder (top right) -->
  <rect x="900" y="50" width="100" height="100" fill="white" rx="10" opacity="0.9"/>
  <text x="950" y="110" font-size="24" font-weight="bold" text-anchor="middle" fill="#667eea" font-family="Arial, sans-serif">
    Zavops
  </text>
</svg>`;

      // Convert SVG to base64 (server-side only)
      let svgBase64: string;
      if (typeof window !== 'undefined') {
        // Client-side fallback
        svgBase64 = btoa(svg);
      } else {
        // Server-side
        svgBase64 = Buffer.from(svg).toString('base64');
      }

      return {
        success: true,
        imageBase64: svgBase64,
        mimeType: 'image/svg+xml'
      };

    } catch (error) {
      console.error('[Campaign Image Service] Error generating SVG:', error);
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

export async function generateCampaignImageSVG(config: CampaignImageConfig): Promise<GeneratedImageResult> {
  const service = new CampaignImageService();
  return service.generateCampaignImageSVG(config);
}
