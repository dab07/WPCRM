# Campaign Images - Implementation Guide

## Overview

Clean, normalized implementation for generating campaign images with Gemini AI. The system automatically generates appropriate greeting images based on campaign names, letting Gemini handle all design decisions.

## Architecture

### Services

**CampaignImageService** (`lib/services/external/CampaignImageService.ts`)
- Generates campaign images using Gemini AI
- Falls back to SVG if Gemini image generation unavailable
- Includes Zavops logo in top-right corner
- Minimal configuration - just campaign name and optional theme

**CampaignOrchestrator** (updated)
- Orchestrates campaign lifecycle
- Generates images during campaign execution
- Sends images with personalized messages
- Maintains backward compatibility

**WhatsAppService** (updated)
- Sends image messages via Meta API
- Supports text, image, template, and interactive messages

### Database Schema

```sql
campaigns
├── id (UUID, PK)
├── name (TEXT)
├── message_template (TEXT)
├── target_tags (TEXT[])
├── status (TEXT)
├── scheduled_at (TIMESTAMPTZ)
├── sent_count (INTEGER)
├── delivered_count (INTEGER)
├── include_image (BOOLEAN) ✨ NEW
├── image_theme (TEXT) ✨ NEW
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

## API Endpoints

### Create Campaign

```bash
POST /api/campaigns/create
```

**Request:**
```json
{
  "name": "Holi 2025 Campaign",
  "message_template": "Hi {{name}}, Happy Holi! 🎨",
  "include_image": true,
  "image_theme": "festive",
  "target_tags": ["customers"],
  "scheduled_at": "2025-03-14T09:00:00Z"
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
    "include_image": true,
    "created_at": "2025-01-20T10:00:00Z"
  }
}
```

### Preview Image

```bash
POST /api/campaigns/create?preview_image=true
```

**Request:**
```json
{
  "name": "Holi Campaign",
  "image_theme": "festive",
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

### List Campaigns

```bash
GET /api/campaigns/create
```

### Execute Campaign

```bash
POST /api/campaigns/orchestrator
```

**Request:**
```json
{
  "campaignId": "uuid-here"
}
```

## Code Examples

### Create Campaign (TypeScript)

```typescript
import { CampaignOrchestrator } from '@/lib/services/campaigns/CampaignOrchestrator';

const orchestrator = new CampaignOrchestrator();

const campaign = await orchestrator.createCampaign({
  name: 'Holi 2025 Celebration',
  message_template: 'Hi {{name}}, wishing you a colorful Holi! 🎨',
  target_tags: ['customers'],
  scheduled_at: new Date('2025-03-14T09:00:00').toISOString(),
  include_image: true,
  image_theme: 'festive'
});
```

### Generate Image

```typescript
import { CampaignImageService } from '@/lib/services/external/CampaignImageService';

const imageService = new CampaignImageService();

const result = await imageService.generateCampaignImageSVG({
  campaignName: 'Holi 2025 Campaign',
  theme: 'festive'
});

if (result.success) {
  console.log('Image generated:', result.imageBase64);
}
```

## Message Flow

```
1. Create Campaign
   ├─ Campaign name
   ├─ Message template
   ├─ Optional theme
   └─ Optional schedule

2. Campaign Execution
   ├─ Get eligible contacts
   └─ For each contact:
      ├─ Personalize message
      ├─ Generate image (if enabled)
      ├─ Send WhatsApp message
      └─ Log delivery

3. Image Generation
   ├─ Gemini analyzes campaign name
   ├─ Generates appropriate greeting
   ├─ Creates professional design
   ├─ Adds Zavops logo
   └─ Returns base64 image
```

## Key Features

✅ **Minimal Configuration** - Just campaign name and optional theme
✅ **Gemini-Powered** - AI understands campaign context
✅ **Automatic Greeting** - No need to specify greeting text
✅ **Professional Design** - Gemini handles all design decisions
✅ **SVG Fallback** - Works even if Gemini image generation unavailable
✅ **Zavops Logo** - Automatically included in top-right corner
✅ **Personalized Messages** - Template variables: {{name}}, {{company}}, {{phone}}
✅ **Scheduled Delivery** - Schedule campaigns for specific dates/times
✅ **Batch Processing** - Efficient delivery to thousands of contacts
✅ **Type-Safe** - Full TypeScript support

## Environment Variables

No new environment variables required. Uses existing:
- `GEMINI_API_KEY` - For AI features
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp Business Account
- `WHATSAPP_ACCESS_TOKEN` - WhatsApp API access

## Database Migration

```bash
supabase migration up
```

Migration adds:
- `include_image` - Boolean flag for image inclusion
- `image_theme` - Optional theme/style preference
- Index on campaigns with images

## File Structure

```
lib/services/
├── external/
│   ├── CampaignImageService.ts    ✨ NEW - Image generation
│   ├── WhatsAppService.ts         📝 UPDATED - Image support
│   └── index.ts                   📝 UPDATED - Exports
├── campaigns/
│   └── CampaignOrchestrator.ts    📝 UPDATED - Campaign support

app/api/campaigns/
├── create/route.ts                ✨ NEW - Campaign API
└── orchestrator/route.ts          (unchanged)

supabase/migrations/
└── 20250120000001_add_festival_campaigns.sql  📝 UPDATED
```

## Performance

- **Batch Processing**: Contacts processed in batches of 10
- **Rate Limiting**: 200ms delay between messages (WhatsApp compliance)
- **Image Caching**: SVG images generated once per campaign
- **Database**: Indexed queries for fast lookups

## Error Handling

- Image generation failures don't block message sending
- Graceful fallback to SVG if Gemini unavailable
- Comprehensive error logging
- User-friendly error messages

## Best Practices

1. **Test First** - Use preview endpoint before sending
2. **Personalize** - Use {{name}} and {{company}} variables
3. **Schedule Ahead** - Plan campaigns 1-2 weeks in advance
4. **Monitor** - Check delivery status and engagement
5. **Segment** - Use target_tags to reach right audience
6. **Timing** - Schedule for 9 AM local time for best engagement

## Testing

```bash
# Create campaign
curl -X POST http://localhost:3000/api/campaigns/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "message_template": "Hi {{name}}, test message!",
    "include_image": true
  }'

# Preview image
curl -X POST "http://localhost:3000/api/campaigns/create?preview_image=true" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "preview_image": true
  }'

# Execute campaign
curl -X POST http://localhost:3000/api/campaigns/orchestrator \
  -H "Content-Type: application/json" \
  -d '{"campaignId": "campaign-id"}'
```

## Troubleshooting

### Campaign Not Sending
1. Check campaign status is 'scheduled' or 'draft'
2. Verify target_tags match contact tags
3. Check WhatsApp credentials in .env
4. Review API logs for errors

### Image Not Appearing
1. Verify logo file exists: `logos/Zavops-Icon-Combo.png.webp`
2. Check image generation logs
3. Ensure WhatsApp Business Account supports images
4. Try preview endpoint to debug

### Contacts Not Receiving
1. Verify phone numbers are valid
2. Check contact tags match campaign target_tags
3. Review WhatsApp delivery status
4. Check rate limiting (200ms delay)

## Future Enhancements

1. **Imagen API Integration** - High-quality AI-generated images
2. **Dynamic Personalization** - Per-contact image customization
3. **A/B Testing** - Multiple image variants per campaign
4. **Analytics** - Track image open rates and engagement
5. **Template Library** - Pre-built campaign templates
6. **Localization** - Multi-language support
7. **Video Support** - Animated campaign videos
8. **Interactive Elements** - Buttons and quick replies

## Summary

Clean, normalized implementation that:
- Lets Gemini handle all design decisions
- Requires minimal configuration
- Maintains backward compatibility
- Provides professional campaign images
- Scales efficiently to thousands of contacts
- Includes comprehensive error handling

Ready for production use.
