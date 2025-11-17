# WhatsApp CRM with AI & n8n Integration

A fully functional WhatsApp CRM system with AI-powered responses, business card extraction, automated follow-ups, and campaign management.

## 🚀 Features

### Core Functionality
- ✅ **Send & Receive WhatsApp Messages** - Real-time messaging via Meta Cloud API
- ✅ **AI-Powered Responses** - Automatic replies using Gemini AI with intent detection
- ✅ **Business Card Extraction** - OCR from text or images with structured data extraction
- ✅ **Automated Follow-ups** - Send messages to inactive conversations (3+ days)
- ✅ **Campaign Management** - Bulk messaging with tag-based targeting
- ✅ **Contact Management** - Customer database with tags, metadata, and search
- ✅ **Conversation Tracking** - Thread management with AI confidence scoring
- ✅ **n8n Integration** - Workflow automation for complex business logic

### Technical Features
- ✅ **Webhook Handler** - Receive and process WhatsApp messages
- ✅ **Message Status Tracking** - Sent, delivered, read, failed
- ✅ **Intent Detection** - Greeting, pricing, support, business card
- ✅ **Confidence Scoring** - AI confidence levels for responses
- ✅ **Rate Limiting** - Prevent spam and API throttling
- ✅ **Database Persistence** - PostgreSQL with Supabase
- ✅ **TypeScript** - Full type safety
- ✅ **Error Handling** - Comprehensive error logging

## 📋 Prerequisites

- Node.js 20+
- Supabase account
- Meta Developer account (WhatsApp Business API)
- Gemini API key
- n8n (optional, for automation)

## 🔧 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd whatsapp-crm
npm install
```

### 2. Setup Environment Variables

Your `.env` file already has Supabase and Gemini configured! ✅

You just need to add WhatsApp credentials:

```bash
# Get these from: https://developers.facebook.com/apps
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to get these:**
- **Phone Number ID & Business Account ID:** Meta Developer Console → WhatsApp → API Setup
- **Access Token:** Meta Developer Console → WhatsApp → API Setup → Generate permanent token
- **Service Role Key:** Supabase Dashboard → Settings → API → service_role key

### 3. Setup Database

Run migrations in Supabase SQL Editor:

1. Go to your Supabase project
2. Click "SQL Editor"
3. Create new query
4. Copy and paste content from `supabase/migrations/20241117000001_complete_schema.sql`
5. Click "Run"
6. Repeat for `supabase/migrations/20241116000001_add_workflow_executions.sql`
7. (Optional) Run `supabase/seed.sql` for sample data

### 4. Configure WhatsApp Webhook

**For Development (using ngrok):**
```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Use the ngrok URL in Meta webhook configuration
# Example: https://abc123.ngrok.io/api/webhooks/whatsapp
```

**In Meta Developer Console:**
1. Go to WhatsApp → Configuration
2. Set webhook URL: `https://your-ngrok-url.ngrok.io/api/webhooks/whatsapp`
3. Set verify token: `whatsapp_crm_verify_token_123` (from your .env)
4. Click "Verify and Save"
5. Subscribe to: `messages`, `message_status`

### 5. Test It!

Send a message to your WhatsApp Business number:
```
Hello!
```

You should see:
- Message logged in console
- Contact created in database
- AI response sent back automatically

### 6. Setup n8n (Optional)

```bash
# Terminal 3
npx n8n
```

Visit `http://localhost:5678` and import workflows from `guides/n8n-workflows/`:
1. `1-follow-up-scheduler.json` - Automated follow-ups
2. `2-webhook-receiver.json` - Development webhook proxy
3. `3-campaign-executor.json` - Bulk messaging

## 📋 Step-by-Step Checklist

Use [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md) to track your progress!

## 📱 How It Works

### Receiving Messages

1. Customer sends WhatsApp message
2. Meta forwards to webhook: `/api/webhooks/whatsapp`
3. System creates/updates contact and conversation
4. AI detects intent and generates response
5. Response sent back via WhatsApp

### Business Card Extraction

Customer sends message with "Lead" keyword or business card image:

```
Lead: John Doe, ABC Company, john@abc.com, +1234567890
```

System:
1. Detects business card intent
2. Extracts information using Gemini AI
3. Creates/updates contact
4. Stores in `business_cards` table
5. Sends confirmation message

### Automated Follow-ups

1. n8n scheduler runs hourly
2. Calls `/api/cron/follow-ups`
3. Finds conversations inactive for 3+ days
4. Sends personalized follow-up message
5. Updates conversation status

### Campaigns

1. Create campaign with target tags
2. Execute via API or n8n
3. System sends to all matching contacts
4. Tracks delivery status
5. Updates campaign metrics

## 🛠️ API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/whatsapp` | POST | Receive WhatsApp messages |
| `/api/webhooks/whatsapp` | GET | Webhook verification |
| `/api/messages/send` | POST | Send message to contact |
| `/api/campaigns/execute` | POST | Execute campaign |
| `/api/cron/follow-ups` | GET | Trigger follow-up check |
| `/api/contacts/create` | POST | Create new contact |

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── webhooks/whatsapp/    # WhatsApp webhook handler
│   │   ├── messages/send/         # Send message API
│   │   ├── campaigns/execute/     # Campaign execution
│   │   └── cron/follow-ups/       # Follow-up automation
│   ├── layout.tsx
│   └── page.tsx
├── components/                     # React components
├── lib/
│   ├── api.ts                     # Type definitions
│   ├── gemini.ts                  # Gemini AI service
│   ├── whatsapp-cloud.ts          # WhatsApp API client
│   └── utils.ts
├── supabase/
│   └── migrations/                # Database schema
├── guides/
│   ├── SETUP_GUIDE.md            # Detailed setup guide
│   └── n8n-workflows/            # n8n workflow templates
└── .env.example
```

## 🔐 Environment Variables

See `.env.example` for all available options.

### Required

- Supabase credentials
- Gemini API key
- WhatsApp Meta Cloud API credentials

### Optional

- n8n configuration
- Alternative WhatsApp providers (Twilio, 360Dialog, etc.)

## 🚀 Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Add environment variables in Vercel dashboard.

### Other Platforms

Works on any Node.js hosting:
- Netlify
- Railway
- Render
- AWS/GCP/Azure

## 📚 Documentation

- [Complete Setup Guide](guides/SETUP_GUIDE.md)
- [n8n Workflows](guides/n8n-workflows/)
- [Meta WhatsApp API Docs](https://developers.facebook.com/docs/whatsapp)
- [Gemini API Docs](https://ai.google.dev/docs)

## 🐛 Troubleshooting

### Webhook not receiving messages
- Verify webhook URL in Meta dashboard
- Check verify token matches
- Test with Meta's webhook tester

### Messages not sending
- Verify access token is valid
- Check phone number ID
- Ensure number is verified in Meta dashboard

### Business card extraction failing
- Verify Gemini API key
- Check API quota
- Ensure image is clear

### Follow-ups not working
- Check n8n workflow is active
- Verify cron schedule
- Review follow-up rules

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 💬 Support

For issues or questions, check:
1. [Setup Guide](guides/SETUP_GUIDE.md)
2. Server logs
3. Meta API documentation
4. Supabase logs
