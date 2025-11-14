# WhatsApp Third-Party Providers - Setup Guide

## Recommended Providers (Easiest to Hardest)

### 1. 🏆 Twilio (Recommended - Easiest)

**Pros:**
- Fastest setup (15 minutes)
- No business verification needed initially
- Great documentation
- Reliable delivery
- Free trial credits

**Pricing:**
- $0.005 per message (conversation-based)
- No monthly fees

**Setup Steps:**

1. **Sign up**: https://www.twilio.com/try-twilio
2. **Get WhatsApp Sandbox** (for testing):
   - Go to Messaging → Try it out → Send a WhatsApp message
   - Follow instructions to join sandbox
3. **Get Production Number** (when ready):
   - Go to Messaging → WhatsApp → Senders
   - Request a WhatsApp-enabled number
4. **Get Credentials**:
   - Account SID: From dashboard
   - Auth Token: From dashboard
   - WhatsApp Number: Your assigned number

**Add to `.env`:**
```bash
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Configure Webhook:**
- Go to Messaging → WhatsApp → Sandbox Settings (or your number settings)
- Set "When a message comes in": `https://your-domain.com/api/webhooks/whatsapp`

---

### 2. 🚀 Wati.io (Best for Non-Technical Users)

**Pros:**
- No coding needed for basic setup
- Built-in CRM features
- Template management UI
- Team inbox
- Free tier available

**Pricing:**
- Free: 1,000 messages/month
- Starter: $39/month

**Setup Steps:**

1. **Sign up**: https://www.wati.io/
2. **Connect WhatsApp**: Follow their wizard
3. **Get API Key**: Settings → API Access
4. **Get Webhook URL**: They provide it

**Add to `.env`:**
```bash
WHATSAPP_PROVIDER=wati
WATI_API_KEY=your_api_key
WATI_API_URL=https://live-server-xxxxx.wati.io
```

---

### 3. 💼 360Dialog (Official Meta Partner)

**Pros:**
- Official Meta Business Solution Provider
- Direct Cloud API access
- No Meta account needed
- Good for scaling

**Pricing:**
- Pay-as-you-go: €0.01-0.05 per message
- No monthly fees

**Setup Steps:**

1. **Sign up**: https://hub.360dialog.com/
2. **Create Client**: Dashboard → Create Client
3. **Get API Key**: Client → API Keys
4. **Get Phone Number**: They provide or you can port yours

**Add to `.env`:**
```bash
WHATSAPP_PROVIDER=360dialog
DIALOG_360_API_KEY=your_api_key
DIALOG_360_PARTNER_ID=your_partner_id
```

---

### 4. 📱 Vonage (formerly Nexmo)

**Pros:**
- Enterprise-grade reliability
- Multi-channel (SMS, WhatsApp, etc.)
- Good API documentation

**Pricing:**
- $0.0042 per message
- Free trial available

**Setup Steps:**

1. **Sign up**: https://www.vonage.com/communications-apis/
2. **Enable WhatsApp**: Messages API → WhatsApp
3. **Get Credentials**: Dashboard → API Settings

**Add to `.env`:**
```bash
WHATSAPP_PROVIDER=vonage
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
VONAGE_WHATSAPP_NUMBER=your_number
```

---

### 5. 🌐 MessageBird

**Pros:**
- Global coverage
- Competitive pricing
- Good for international businesses

**Pricing:**
- €0.01-0.05 per message

**Setup Steps:**

1. **Sign up**: https://messagebird.com/
2. **Add WhatsApp Channel**: Channels → WhatsApp
3. **Get API Key**: Developers → API Keys

**Add to `.env`:**
```bash
WHATSAPP_PROVIDER=messagebird
MESSAGEBIRD_API_KEY=your_api_key
MESSAGEBIRD_CHANNEL_ID=your_channel_id
```

---

## Quick Comparison

| Provider | Setup Time | Free Tier | Best For |
|----------|-----------|-----------|----------|
| **Twilio** | 15 min | Trial credits | Developers, quick start |
| **Wati.io** | 10 min | 1K msgs/month | Non-technical, small teams |
| **360Dialog** | 30 min | No | Scaling, official access |
| **Vonage** | 20 min | Trial credits | Enterprise, multi-channel |
| **MessageBird** | 20 min | Trial credits | International businesses |

---

## My Recommendation for You: Start with Twilio

**Why Twilio:**
1. ✅ Fastest to get started (sandbox available immediately)
2. ✅ Your code already supports it
3. ✅ Free trial credits to test
4. ✅ Easy to switch to production
5. ✅ Best documentation

**Quick Start with Twilio:**

```bash
# 1. Sign up at twilio.com
# 2. Get your sandbox number (instant)
# 3. Add to .env:
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Sandbox number

# 4. Test immediately - no deployment needed for sandbox!
```

---

## Next Steps

1. Choose a provider (I recommend Twilio for fastest start)
2. Sign up and get credentials
3. Add credentials to `.env`
4. Test with sandbox/test number
5. Deploy webhook when ready for production

Need help with any specific provider setup? Let me know!
