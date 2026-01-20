# Festival-Themed Campaign System

This guide explains how to use the festival-themed greeting image system for WhatsApp campaigns.

## Overview

The festival campaign system automatically generates beautiful, festival-themed greeting images with the Zavops logo and sends them alongside personalized messages to customers. Each festival has its own color theme, design elements, and styling.

## Supported Festivals

- **Holi** - Festival of Colors (vibrant, colorful splashes)
- **Diwali** - Festival of Lights (glowing diyas, fireworks)
- **Christmas** - Holiday celebration (festive decorations)
- **New Year** - New Year celebration (fireworks, confetti)
- **Eid** - Islamic celebration (elegant, spiritual)
- **Thanksgiving** - Harvest celebration (autumn elements)
- **Valentine** - Love celebration (hearts, roses)
- **Easter** - Spring celebration (eggs, bunnies)

## Architecture

### Components

1. **FestivalImageService** (`lib/services/external/FestivalImageService.ts`)
   - Generates festival-themed images using Gemini AI
   - Creates SVG-based fallback images with festival colors and elements
   - Integrates Zavops logo in top-right corner
   - Supports multiple image generation methods

2. **CampaignOrchestrator** (updated)
   - Extended to support festival campaigns
   - Generates images during campaign execution
   - Sends images alongside personalized messages

3. **WhatsAppService** (updated)
   - Added image message support
   - Handles image/caption delivery via Meta API

4. **Database Schema** (new migration)
   - `festival_type`: Type of festival (holi, diwali, etc.)
   - `greeting_text`: Custom greeting (e.g., "Happy Holi")
   - `include_image`: Whether to send festival image
   - `image_theme`: Color theme preferences

## API Endpoints

### Create Festival Campaign

**POST** `/api/campaigns/festival`

```json
{
  "name": "Holi 2025 Campaign",
  "message_template": "Hi {{name}}, wishing you a colorful Holi! 🎨",
  "target_tags": ["customers", "active"],
  "scheduled_at": "2025-03-14T09:00:00Z",
  "festival_type": "holi",
  "greeting_text": "Happy Holi",
  "include_image": true,
  "image_theme": "vibrant"
}
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "name": "Holi 2025 Campaign",
    "status": "scheduled",
    "festival_type": "holi",
    "greeting_text": "Happy Holi",
    "include_image": true,
    "created_at": "2025-01-20T10:00:00Z"
  }
}
```

### Preview Festival Image

**POST** `/api/campaigns/festival?preview_image=true`

```json
{
  "name": "Holi Campaign",
  "festival_type": "holi",
  "greeting_text": "Happy Holi",
  "preview_image": true
}
```

**Response:**
```json
{
  "success": true,
  "preview": {
    "imageBase64": "data:image/svg+xml;base64,...",
    "mimeType": "image/svg+xml"
  }
}
```

### Get Festival Campaigns

**GET** `/api/campaigns/festival`

**Response:**
```json
{
  "success": true,
  "campaigns": [
    {
      "id": "uuid",
      "name": "Holi 2025 Campaign",
      "festival_type": "holi",
      "greeting_text": "Happy Holi",
      "status": "scheduled",
      "sent_count": 0
    }
  ],
  "total": 1
}
```

## Usage Examples

### Example 1: Holi Campaign

```typescript
import { CampaignOrchestrator } from '@/lib/services/campaigns/CampaignOrchestrator';

const orchestrator = new CampaignOrchestrator();

const campaign = await orchestrator.createCampaign({
  name: 'Holi 2025 Celebration',
  message_template: 'Hi {{name}}, wishing you and your family a very Happy Holi! 🎨 May this festival bring joy and colors to your life.',
  target_tags: ['customers', 'vip'],
  scheduled_at: new Date('2025-03-14T09:00:00').toISOString(),
  festival_type: 'holi',
  greeting_text: 'Happy Holi',
  include_image: true,
  image_theme: 'vibrant'
});
```

### Example 2: Diwali Campaign

```typescript
const campaign = await orchestrator.createCampaign({
  name: 'Diwali Special Offer',
  message_template: 'Dear {{name}}, celebrate Diwali with us! Special discounts available. 🪔✨',
  target_tags: ['customers'],
  scheduled_at: new Date('2025-11-01T09:00:00').toISOString(),
  festival_type: 'diwali',
  greeting_text: 'Happy Diwali',
  include_image: true,
  image_theme: 'warm'
});
```

### Example 3: Christmas Campaign

```typescript
const campaign = await orchestrator.createCampaign({
  name: 'Christmas Greetings',
  message_template: 'Merry Christmas {{name}}! 🎄 Wishing you a wonderful holiday season.',
  target_tags: ['all_contacts'],
  scheduled_at: new Date('2025-12-25T09:00:00').toISOString(),
  festival_type: 'christmas',
  greeting_text: 'Merry Christmas',
  include_image: true,
  image_theme: 'festive'
});
```

## Festival Color Themes

### Holi
- **Colors**: Vibrant pink, bright yellow, electric blue, lime green, orange
- **Elements**: Pichkari (water gun), colored powder, flowers, playful splashes
- **Style**: Vibrant, playful, colorful splashes

### Diwali
- **Colors**: Deep orange, gold, dark red, burgundy, warm yellow
- **Elements**: Diyas (oil lamps), fireworks, rangoli patterns, lights, sparkles
- **Style**: Warm, festive, glowing lights

### Christmas
- **Colors**: Red, green, gold, white, silver
- **Elements**: Christmas tree, ornaments, snow, gifts, holly, bells
- **Style**: Festive, warm, snowy

### New Year
- **Colors**: Gold, silver, black, champagne, white
- **Elements**: Fireworks, champagne, confetti, clock, celebration
- **Style**: Elegant, celebratory, shimmering

### Eid
- **Colors**: Emerald green, gold, white, silver, cream
- **Elements**: Crescent moon, lanterns, flowers, geometric patterns, lights
- **Style**: Elegant, spiritual, warm

### Thanksgiving
- **Colors**: Burnt orange, brown, gold, cream, deep red
- **Elements**: Cornucopia, pumpkins, autumn leaves, wheat, harvest
- **Style**: Warm, harvest-themed, rustic

### Valentine
- **Colors**: Red, pink, white, gold, rose
- **Elements**: Hearts, roses, cupid, love symbols, sparkles
- **Style**: Romantic, elegant, loving

### Easter
- **Colors**: Pastel pink, pastel blue, pastel yellow, white, green
- **Elements**: Easter eggs, bunnies, flowers, spring elements, baskets
- **Style**: Cheerful, spring-like, playful

## Message Flow

1. **Campaign Creation**
   - User creates festival campaign with festival type and greeting text
   - Campaign is stored in database with festival metadata

2. **Campaign Execution** (scheduled or manual)
   - CampaignOrchestrator fetches eligible contacts
   - For each contact:
     - Personalizes message template
     - Generates festival image (if enabled)
     - Sends WhatsApp message with image and caption
     - Logs message in database

3. **Image Generation**
   - FestivalImageService creates SVG-based image
   - Image includes:
     - Festival-themed background with colors
     - Large greeting text (e.g., "Happy Holi")
     - Zavops logo in top-right corner
     - Festival-specific design elements

4. **WhatsApp Delivery**
   - Image sent as WhatsApp image message
   - Greeting text sent as image caption
   - Message template sent as follow-up text (optional)

## Database Schema

### Campaigns Table (Extended)

```sql
ALTER TABLE campaigns ADD COLUMN festival_type TEXT;
ALTER TABLE campaigns ADD COLUMN greeting_text TEXT;
ALTER TABLE campaigns ADD COLUMN include_image BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN image_theme TEXT;
```

### Messages Table (Metadata)

Festival campaign messages include metadata:
```json
{
  "campaign_id": "uuid",
  "campaign_name": "Holi 2025 Campaign",
  "contact_id": "uuid",
  "festival_type": "holi",
  "has_image": true
}
```

## Configuration

### Environment Variables

No additional environment variables required. Uses existing:
- `GEMINI_API_KEY` - For image generation
- `WHATSAPP_PHONE_NUMBER_ID` - For WhatsApp API
- `WHATSAPP_ACCESS_TOKEN` - For WhatsApp API

### Logo Configuration

The Zavops logo is automatically loaded from:
```
logos/Zavops-Icon-Combo.png.webp
```

If the logo is not found, the system continues without it (graceful degradation).

## Image Generation Methods

### Method 1: SVG-Based (Default)
- Fast, reliable, no external API calls
- Creates professional SVG images
- Includes festival colors and elements
- Zavops logo in top-right corner

### Method 2: Gemini AI (Future)
- Requires Gemini 2.0 Flash with image generation
- More realistic, artistic images
- Requires additional API configuration

### Method 3: Imagen API (Future)
- Google's Imagen API for high-quality images
- Requires `IMAGEN_API_KEY` environment variable
- Best quality but slower

## Error Handling

### Image Generation Failures
- If image generation fails, message is still sent as text
- Error logged but campaign continues
- Graceful degradation ensures delivery

### WhatsApp API Failures
- Automatic retry with exponential backoff
- Failed messages logged with error details
- Campaign status updated to 'paused' if critical error

### Logo Loading Failures
- System continues without logo
- Image still generated with festival theme
- Warning logged for debugging

## Performance Considerations

- **Batch Processing**: Contacts processed in batches of 10
- **Rate Limiting**: 200ms delay between messages (WhatsApp compliance)
- **Image Caching**: SVG images generated once per campaign
- **Database**: Indexed queries for festival campaigns

## Testing

### Test Festival Campaign Creation

```bash
curl -X POST http://localhost:3000/api/campaigns/festival \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Holi Campaign",
    "message_template": "Happy Holi {{name}}!",
    "festival_type": "holi",
    "greeting_text": "Happy Holi",
    "include_image": true
  }'
```

### Test Image Preview

```bash
curl -X POST http://localhost:3000/api/campaigns/festival?preview_image=true \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "festival_type": "holi",
    "greeting_text": "Happy Holi"
  }'
```

## Troubleshooting

### Images Not Sending
1. Check `WHATSAPP_ACCESS_TOKEN` is valid
2. Verify `WHATSAPP_PHONE_NUMBER_ID` is correct
3. Check WhatsApp Business Account has image sending enabled
4. Review logs for specific error messages

### Logo Not Appearing
1. Verify logo file exists at `logos/Zavops-Icon-Combo.png.webp`
2. Check file permissions
3. Verify file format is supported (WEBP)

### Campaign Not Executing
1. Check campaign status is 'scheduled'
2. Verify scheduled_at time has passed
3. Check target_tags match contact tags
4. Review database for campaign record

## Future Enhancements

1. **Dynamic Image Generation**: Real-time image generation per contact
2. **Custom Branding**: Support for custom logos and colors
3. **A/B Testing**: Multiple image variants per campaign
4. **Analytics**: Track image open rates and engagement
5. **Template Library**: Pre-built festival templates
6. **Localization**: Multi-language greeting text
7. **Video Support**: Animated festival videos
8. **Interactive Elements**: Buttons and quick replies on images

## Support

For issues or questions:
1. Check logs in `/app/api/campaigns/festival/route.ts`
2. Review FestivalImageService error messages
3. Verify database schema migration applied
4. Check WhatsApp API credentials
