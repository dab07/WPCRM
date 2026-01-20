# Festival Campaigns - Quick Start Guide

## What's New

Festival-themed campaigns now send beautiful, personalized greeting images alongside WhatsApp messages. Each festival has its own color theme, design elements, and the Zavops logo in the top-right corner.

## Supported Festivals

| Festival | Emoji | Greeting | Colors | Elements |
|----------|-------|----------|--------|----------|
| Holi | 🎨 | Happy Holi | Vibrant pink, yellow, blue, green | Pichkari, colored powder, flowers |
| Diwali | 🪔 | Happy Diwali | Orange, gold, red, burgundy | Diyas, fireworks, rangoli, lights |
| Christmas | 🎄 | Merry Christmas | Red, green, gold, white, silver | Tree, ornaments, snow, gifts |
| New Year | 🎆 | Happy New Year | Gold, silver, black, champagne | Fireworks, confetti, celebration |
| Eid | 🌙 | Eid Mubarak | Emerald green, gold, white, cream | Moon, lanterns, flowers, patterns |
| Thanksgiving | 🦃 | Happy Thanksgiving | Orange, brown, gold, cream, red | Cornucopia, pumpkins, leaves |
| Valentine | ❤️ | Happy Valentine's Day | Red, pink, white, gold, rose | Hearts, roses, cupid, sparkles |
| Easter | 🐰 | Happy Easter | Pastel pink, blue, yellow, white | Eggs, bunnies, flowers, baskets |

## Quick Setup

### 1. Database Migration

Apply the migration to add festival fields to campaigns:

```bash
# The migration is already created at:
# supabase/migrations/20250120000001_add_festival_campaigns.sql

# Apply via Supabase CLI:
supabase migration up
```

### 2. Create a Festival Campaign (API)

```bash
curl -X POST http://localhost:3000/api/campaigns/festival \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Holi 2025 Campaign",
    "message_template": "Hi {{name}}, Happy Holi! 🎨",
    "festival_type": "holi",
    "greeting_text": "Happy Holi",
    "include_image": true,
    "target_tags": ["customers"],
    "scheduled_at": "2025-03-14T09:00:00Z"
  }'
```

### 3. Preview Image

```bash
curl -X POST "http://localhost:3000/api/campaigns/festival?preview_image=true" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Holi Campaign",
    "festival_type": "holi",
    "greeting_text": "Happy Holi"
  }'
```

### 4. Execute Campaign

```bash
curl -X POST http://localhost:3000/api/campaigns/orchestrator \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "your-campaign-id"
  }'
```

## Code Examples

### Create Holi Campaign (TypeScript)

```typescript
import { CampaignOrchestrator } from '@/lib/services/campaigns/CampaignOrchestrator';

const orchestrator = new CampaignOrchestrator();

const campaign = await orchestrator.createCampaign({
  name: 'Holi 2025 Celebration',
  message_template: 'Hi {{name}}, wishing you a colorful Holi! 🎨',
  target_tags: ['customers', 'active'],
  scheduled_at: new Date('2025-03-14T09:00:00').toISOString(),
  festival_type: 'holi',
  greeting_text: 'Happy Holi',
  include_image: true,
  image_theme: 'vibrant'
});
```

### Use UI Components

```tsx
import FestivalCampaignForm from '@/components/FestivalCampaignForm';
import FestivalCampaignsList from '@/components/FestivalCampaignsList';

export default function CampaignsPage() {
  return (
    <div className="space-y-8">
      <FestivalCampaignForm 
        onSuccess={(campaign) => console.log('Created:', campaign)}
        onError={(error) => console.error('Error:', error)}
      />
      <FestivalCampaignsList />
    </div>
  );
}
```

## Message Flow

```
1. Create Campaign
   ↓
2. Set Festival Type & Greeting
   ↓
3. Schedule or Save as Draft
   ↓
4. Campaign Execution (Scheduled or Manual)
   ↓
5. For Each Contact:
   - Personalize message
   - Generate festival image
   - Send WhatsApp message with image
   - Log delivery
```

## File Structure

```
lib/services/
├── external/
│   ├── FestivalImageService.ts    # Image generation
│   ├── WhatsAppService.ts         # Updated with image support
│   └── GeminiService.ts           # AI integration
├── campaigns/
│   ├── CampaignOrchestrator.ts    # Updated with festival support
│   └── examples.ts                # Example implementations
│
components/
├── FestivalCampaignForm.tsx       # Create campaigns UI
└── FestivalCampaignsList.tsx      # View campaigns UI

app/api/
├── campaigns/
│   ├── festival/route.ts          # Festival campaign API
│   └── orchestrator/route.ts      # Campaign execution API

supabase/migrations/
└── 20250120000001_add_festival_campaigns.sql

FESTIVAL_CAMPAIGNS_GUIDE.md        # Detailed documentation
FESTIVAL_CAMPAIGNS_QUICK_START.md  # This file
```

## Key Features

✅ **Automatic Image Generation** - SVG-based festival images with Zavops logo
✅ **Personalized Messages** - Template variables: {{name}}, {{company}}, {{phone}}
✅ **Festival Themes** - 8 pre-configured festivals with unique colors
✅ **Scheduled Delivery** - Schedule campaigns for specific dates/times
✅ **Batch Processing** - Efficient delivery to thousands of contacts
✅ **Error Handling** - Graceful degradation if image generation fails
✅ **Rate Limiting** - WhatsApp API compliance (200ms between messages)
✅ **Database Tracking** - Full campaign and message history

## Environment Variables

No new environment variables needed. Uses existing:
- `GEMINI_API_KEY` - For AI features
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp Business Account
- `WHATSAPP_ACCESS_TOKEN` - WhatsApp API access

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

## Performance Tips

- **Batch Size**: Contacts processed in batches of 10
- **Rate Limiting**: 200ms delay between messages (WhatsApp compliance)
- **Image Caching**: SVG images generated once per campaign
- **Database**: Indexed queries for fast lookups

## Next Steps

1. ✅ Apply database migration
2. ✅ Test with preview endpoint
3. ✅ Create first festival campaign
4. ✅ Monitor delivery and engagement
5. ✅ Customize messages for your audience
6. ✅ Schedule campaigns for upcoming festivals

## Support Resources

- **Full Guide**: See `FESTIVAL_CAMPAIGNS_GUIDE.md`
- **Examples**: See `lib/services/campaigns/examples.ts`
- **API Docs**: See `app/api/campaigns/festival/route.ts`
- **Components**: See `components/FestivalCampaign*.tsx`

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/campaigns/festival` | Create festival campaign |
| GET | `/api/campaigns/festival` | List festival campaigns |
| POST | `/api/campaigns/orchestrator` | Execute campaign |
| GET | `/api/campaigns/orchestrator` | List all campaigns |

## Example Payloads

### Create Campaign
```json
{
  "name": "Holi 2025",
  "message_template": "Hi {{name}}, Happy Holi!",
  "festival_type": "holi",
  "greeting_text": "Happy Holi",
  "include_image": true,
  "target_tags": ["customers"],
  "scheduled_at": "2025-03-14T09:00:00Z"
}
```

### Preview Image
```json
{
  "name": "Holi Campaign",
  "festival_type": "holi",
  "greeting_text": "Happy Holi",
  "preview_image": true
}
```

### Execute Campaign
```json
{
  "campaignId": "uuid-here"
}
```

## Best Practices

1. **Test First** - Use preview endpoint before sending
2. **Personalize** - Use {{name}} and {{company}} variables
3. **Schedule Ahead** - Plan campaigns 1-2 weeks in advance
4. **Monitor** - Check delivery status and engagement
5. **Segment** - Use target_tags to reach right audience
6. **Timing** - Schedule for 9 AM local time for best engagement
7. **Content** - Keep messages under 160 characters for SMS fallback

## Changelog

### v1.0 (2025-01-20)
- ✨ Festival-themed image generation
- ✨ 8 pre-configured festivals
- ✨ Zavops logo integration
- ✨ SVG-based image fallback
- ✨ UI components for campaign management
- ✨ API endpoints for campaign creation and execution
- ✨ Database schema extensions
