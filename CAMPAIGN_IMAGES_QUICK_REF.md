# Campaign Images - Quick Reference

## Create Campaign with Image

```typescript
import { CampaignOrchestrator } from '@/lib/services/campaigns/CampaignOrchestrator';

const orchestrator = new CampaignOrchestrator();

const campaign = await orchestrator.createCampaign({
  name: 'Holi 2025 Campaign',
  message_template: 'Hi {{name}}, Happy Holi! 🎨',
  target_tags: ['customers'],
  scheduled_at: new Date('2025-03-14T09:00:00').toISOString(),
  include_image: true,
  image_theme: 'festive'
});
```

## API Endpoints

### Create Campaign
```bash
POST /api/campaigns/create
Content-Type: application/json

{
  "name": "Campaign Name",
  "message_template": "Message with {{name}}",
  "include_image": true,
  "image_theme": "festive",
  "target_tags": ["tag1", "tag2"],
  "scheduled_at": "2025-03-14T09:00:00Z"
}
```

### Preview Image
```bash
POST /api/campaigns/create?preview_image=true
Content-Type: application/json

{
  "name": "Campaign Name",
  "image_theme": "festive",
  "preview_image": true
}
```

### List Campaigns
```bash
GET /api/campaigns/create
```

### Execute Campaign
```bash
POST /api/campaigns/orchestrator
Content-Type: application/json

{
  "campaignId": "uuid-here"
}
```

## Generate Image Directly

```typescript
import { CampaignImageService } from '@/lib/services/external/CampaignImageService';

const imageService = new CampaignImageService();

const result = await imageService.generateCampaignImageSVG({
  campaignName: 'Holi 2025 Campaign',
  theme: 'festive'
});

if (result.success) {
  console.log('Image:', result.imageBase64);
  console.log('Type:', result.mimeType);
}
```

## Message Template Variables

- `{{name}}` - Customer name
- `{{company}}` - Customer company
- `{{phone}}` - Customer phone number

Example:
```
Hi {{name}} from {{company}},

Wishing you a Happy Holi! 🎨

Best regards,
Zavops Team
```

## Database Schema

```sql
campaigns
├── id (UUID)
├── name (TEXT)
├── message_template (TEXT)
├── target_tags (TEXT[])
├── status (TEXT)
├── scheduled_at (TIMESTAMPTZ)
├── sent_count (INTEGER)
├── delivered_count (INTEGER)
├── include_image (BOOLEAN)
├── image_theme (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

## Campaign Lifecycle

```
1. Create
   └─ POST /api/campaigns/create

2. Schedule
   └─ Set scheduled_at date/time

3. Execute (Automatic or Manual)
   └─ POST /api/campaigns/orchestrator

4. Monitor
   └─ GET /api/campaigns/create
```

## Image Themes

Optional theme suggestions:
- `festive` - Celebratory
- `professional` - Business
- `warm` - Friendly
- `elegant` - Sophisticated
- `playful` - Fun
- `modern` - Contemporary

Gemini AI adapts design based on campaign name and theme.

## Error Handling

```typescript
try {
  const campaign = await orchestrator.createCampaign({...});
} catch (error) {
  if (error instanceof CampaignOrchestratorError) {
    console.error('Campaign error:', error.message);
  }
}
```

## Common Scenarios

### Holi Campaign
```json
{
  "name": "Holi 2025 Celebration",
  "message_template": "Hi {{name}}, Happy Holi! 🎨",
  "include_image": true,
  "image_theme": "festive"
}
```

### Diwali Campaign
```json
{
  "name": "Diwali Special Offers",
  "message_template": "Dear {{name}}, celebrate Diwali with us! 🪔",
  "include_image": true,
  "image_theme": "warm"
}
```

### Christmas Campaign
```json
{
  "name": "Christmas Greetings",
  "message_template": "Merry Christmas {{name}}! 🎄",
  "include_image": true,
  "image_theme": "festive"
}
```

### Business Campaign
```json
{
  "name": "Q1 2025 Product Launch",
  "message_template": "Hi {{name}}, check out our new product! 🚀",
  "include_image": true,
  "image_theme": "professional"
}
```

## Testing

```bash
# Create test campaign
curl -X POST http://localhost:3000/api/campaigns/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "message_template": "Hi {{name}}, test!",
    "include_image": true
  }'

# Preview image
curl -X POST "http://localhost:3000/api/campaigns/create?preview_image=true" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "preview_image": true
  }'
```

## Key Features

✅ Campaign name drives design
✅ Gemini AI generates greeting
✅ Professional images with Zavops logo
✅ Personalized messages
✅ Scheduled delivery
✅ Batch processing
✅ Error handling
✅ Type-safe

## Environment Variables

```bash
GEMINI_API_KEY=your-key
WHATSAPP_PHONE_NUMBER_ID=your-id
WHATSAPP_ACCESS_TOKEN=your-token
```

## Documentation

- **Full Guide**: `CAMPAIGN_IMAGES_IMPLEMENTATION.md`
- **Cleanup Info**: `CLEANUP_SUMMARY.md`
- **This File**: `CAMPAIGN_IMAGES_QUICK_REF.md`

## Support

For issues:
1. Check logs for error messages
2. Verify environment variables
3. Test preview endpoint
4. Check WhatsApp credentials
5. Review database records
