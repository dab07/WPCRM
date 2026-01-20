# 🎉 Festival Campaigns - WhatsApp CRM

Beautiful, festival-themed greeting images for WhatsApp business campaigns.

## ✨ Features

- **8 Pre-configured Festivals** - Holi, Diwali, Christmas, New Year, Eid, Thanksgiving, Valentine, Easter
- **Automatic Image Generation** - SVG-based festival images with Zavops logo
- **Personalized Messages** - Template variables for customer names, companies, phone numbers
- **Scheduled Delivery** - Schedule campaigns for specific dates and times
- **Batch Processing** - Efficiently send to thousands of contacts
- **Beautiful UI** - User-friendly components for campaign management
- **Type-Safe** - Full TypeScript support with zero diagnostics
- **Well-Documented** - Comprehensive guides and examples

## 🚀 Quick Start

### 1. Apply Database Migration

```bash
supabase migration up
```

### 2. Create a Campaign

```typescript
import { CampaignOrchestrator } from '@/lib/services/campaigns/CampaignOrchestrator';

const orchestrator = new CampaignOrchestrator();

const campaign = await orchestrator.createCampaign({
  name: 'Holi 2025 Celebration',
  message_template: 'Hi {{name}}, wishing you a colorful Holi! 🎨',
  target_tags: ['customers'],
  scheduled_at: new Date('2025-03-14T09:00:00').toISOString(),
  festival_type: 'holi',
  greeting_text: 'Happy Holi',
  include_image: true,
  image_theme: 'vibrant'
});
```

### 3. Use UI Components

```tsx
import FestivalCampaignForm from '@/components/FestivalCampaignForm';
import FestivalCampaignsList from '@/components/FestivalCampaignsList';

export default function CampaignsPage() {
  return (
    <div className="space-y-8">
      <FestivalCampaignForm />
      <FestivalCampaignsList />
    </div>
  );
}
```

## 📚 Documentation

- **[FESTIVAL_CAMPAIGNS_GUIDE.md](./FESTIVAL_CAMPAIGNS_GUIDE.md)** - Comprehensive guide with architecture, API docs, and examples
- **[FESTIVAL_CAMPAIGNS_QUICK_START.md](./FESTIVAL_CAMPAIGNS_QUICK_START.md)** - Quick reference guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - What was built and how
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Pre and post-deployment checklist

## 🎨 Supported Festivals

| Festival | Emoji | Greeting | Colors | Elements |
|----------|-------|----------|--------|----------|
| Holi | 🎨 | Happy Holi | Vibrant pink, yellow, blue, green | Pichkari, powder, flowers |
| Diwali | 🪔 | Happy Diwali | Orange, gold, red, burgundy | Diyas, fireworks, rangoli |
| Christmas | 🎄 | Merry Christmas | Red, green, gold, white, silver | Tree, ornaments, snow, gifts |
| New Year | 🎆 | Happy New Year | Gold, silver, black, champagne | Fireworks, confetti |
| Eid | 🌙 | Eid Mubarak | Emerald green, gold, white, cream | Moon, lanterns, flowers |
| Thanksgiving | 🦃 | Happy Thanksgiving | Orange, brown, gold, cream, red | Cornucopia, pumpkins, leaves |
| Valentine | ❤️ | Happy Valentine's Day | Red, pink, white, gold, rose | Hearts, roses, cupid |
| Easter | 🐰 | Happy Easter | Pastel pink, blue, yellow, white | Eggs, bunnies, flowers |

## 🔌 API Endpoints

### Create Festival Campaign
```bash
POST /api/campaigns/festival
```

**Request:**
```json
{
  "name": "Holi 2025 Campaign",
  "message_template": "Hi {{name}}, Happy Holi! 🎨",
  "festival_type": "holi",
  "greeting_text": "Happy Holi",
  "include_image": true,
  "target_tags": ["customers"],
  "scheduled_at": "2025-03-14T09:00:00Z"
}
```

### Preview Image
```bash
POST /api/campaigns/festival?preview_image=true
```

**Request:**
```json
{
  "name": "Holi Campaign",
  "festival_type": "holi",
  "greeting_text": "Happy Holi"
}
```

### List Festival Campaigns
```bash
GET /api/campaigns/festival
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

## 📁 File Structure

```
lib/services/
├── external/
│   ├── FestivalImageService.ts    # Image generation
│   ├── WhatsAppService.ts         # Updated with image support
│   └── index.ts                   # Exports
├── campaigns/
│   ├── CampaignOrchestrator.ts    # Updated with festival support
│   └── examples.ts                # 12 example implementations

components/
├── FestivalCampaignForm.tsx       # Create campaigns UI
└── FestivalCampaignsList.tsx      # View campaigns UI

app/api/campaigns/
├── festival/route.ts              # Festival campaign API
└── orchestrator/route.ts          # Campaign execution API

supabase/migrations/
└── 20250120000001_add_festival_campaigns.sql

Documentation/
├── FESTIVAL_CAMPAIGNS_GUIDE.md
├── FESTIVAL_CAMPAIGNS_QUICK_START.md
├── IMPLEMENTATION_SUMMARY.md
├── DEPLOYMENT_CHECKLIST.md
└── README_FESTIVAL_CAMPAIGNS.md   # This file
```

## 💻 Code Examples

### Example 1: Create Holi Campaign
```typescript
import { createHoliCampaign } from '@/lib/services/campaigns/examples';

const campaign = await createHoliCampaign();
```

### Example 2: Create Custom Festival Campaign
```typescript
import { createCustomFestivalCampaign } from '@/lib/services/campaigns/examples';

const campaign = await createCustomFestivalCampaign(
  'Diwali',
  'Happy Diwali',
  'Hi {{name}}, celebrate Diwali with us! 🪔',
  new Date('2025-11-01T09:00:00'),
  ['customers', 'vip']
);
```

### Example 3: Execute Campaign Manually
```typescript
import { executeCampaignManually } from '@/lib/services/campaigns/examples';

const result = await executeCampaignManually('campaign-id');
```

## 🎯 Message Personalization

Use template variables in your message:
- `{{name}}` - Customer name
- `{{company}}` - Customer company
- `{{phone}}` - Customer phone number

**Example:**
```
Hi {{name}} from {{company}},

Wishing you a Happy Holi! 🎨

We're excited to celebrate with you.

Best regards,
Zavops Team
```

## ⚙️ Configuration

### Environment Variables

No new environment variables required. Uses existing:
- `GEMINI_API_KEY` - For AI features
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp Business Account
- `WHATSAPP_ACCESS_TOKEN` - WhatsApp API access

### Logo Configuration

The Zavops logo is automatically loaded from:
```
logos/Zavops-Icon-Combo.png.webp
```

If the logo is not found, the system continues without it (graceful degradation).

## 🔄 Message Flow

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

## 📊 Performance

- **Batch Processing**: Contacts processed in batches of 10
- **Rate Limiting**: 200ms delay between messages (WhatsApp compliance)
- **Image Caching**: SVG images generated once per campaign
- **Database**: Indexed queries for fast lookups

## 🧪 Testing

All components have been tested for:
- ✅ Type safety (zero TypeScript diagnostics)
- ✅ Compilation (no errors)
- ✅ Integration (with existing services)
- ✅ Error handling (graceful degradation)
- ✅ Performance (batch processing)

## 🐛 Troubleshooting

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

## 🚀 Deployment

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for complete deployment instructions.

## 📖 Learn More

- [Full Guide](./FESTIVAL_CAMPAIGNS_GUIDE.md) - Comprehensive documentation
- [Quick Start](./FESTIVAL_CAMPAIGNS_QUICK_START.md) - Quick reference
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - What was built
- [Examples](./lib/services/campaigns/examples.ts) - 12 code examples

## 🎓 Best Practices

1. **Test First** - Use preview endpoint before sending
2. **Personalize** - Use {{name}} and {{company}} variables
3. **Schedule Ahead** - Plan campaigns 1-2 weeks in advance
4. **Monitor** - Check delivery status and engagement
5. **Segment** - Use target_tags to reach right audience
6. **Timing** - Schedule for 9 AM local time for best engagement
7. **Content** - Keep messages under 160 characters for SMS fallback

## 🔮 Future Enhancements

1. **Imagen API Integration** - High-quality AI-generated images
2. **Gemini Image Generation** - Realistic, artistic images
3. **Dynamic Personalization** - Per-contact image customization
4. **A/B Testing** - Multiple image variants per campaign
5. **Analytics** - Track image open rates and engagement
6. **Template Library** - Pre-built festival templates
7. **Localization** - Multi-language greeting text
8. **Video Support** - Animated festival videos
9. **Interactive Elements** - Buttons and quick replies
10. **Custom Branding** - User-defined logos and colors

## 📝 License

This implementation is part of the WhatsApp CRM system.

## 🤝 Support

For issues or questions:
1. Check the [Full Guide](./FESTIVAL_CAMPAIGNS_GUIDE.md)
2. Review [Quick Start](./FESTIVAL_CAMPAIGNS_QUICK_START.md)
3. See [Examples](./lib/services/campaigns/examples.ts)
4. Check API logs for specific errors

## 📞 Contact

For support or feature requests, please contact the development team.

---

**Version**: 1.0  
**Last Updated**: January 20, 2025  
**Status**: Production Ready ✅
