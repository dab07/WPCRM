# WhatsApp Business API Setup Guide

## Overview

This guide will help you integrate WhatsApp Business API with your CRM system. You have two main options:

1. **Meta Cloud API** (Recommended for most users)
2. **WhatsApp Business Platform (On-Premises)** (For enterprise with high volume)

## Option 1: Meta Cloud API (Recommended)

### Prerequisites

- Facebook Business Account
- Meta Developer Account
- Verified Business
- Phone number for WhatsApp Business

### Step 1: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Business" as app type
4. Fill in app details:
   - App Name: "WhatsApp CRM"
   - Contact Email: Your business email
   - Business Account: Select your business

### Step 2: Add WhatsApp Product

1. In your app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set Up"
3. Select your Business Account
4. Add a phone number or use the test number provided

### Step 3: Get API Credentials

1. Navigate to WhatsApp → Getting Started
2. Copy the following credentials:
   - **Phone Number ID**: Found under "From" section
   - **WhatsApp Business Account ID**: In the top section
   - **Temporary Access Token**: Click "Generate" (valid 24 hours)
   - **Permanent Access Token**: Generate via System Users (see below)

### Step 4: Generate Permanent Access Token

1. Go to Business Settings → System Users
2. Click "Add" to create a system user
3. Assign the system user to your app
4. Generate a token with these permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Save this token securely

### Step 5: Configure Webhook

1. In WhatsApp → Configuration
2. Click "Edit" under Webhook
3. Set Callback URL: `https://your-domain.com/api/webhooks/whatsapp`
4. Set Verify Token: Generate a random string (save this)
5. Subscribe to these fields:
   - `messages`
   - `message_status`
   - `message_template_status_update`

### Step 6: Add Environment Variables

Add to your `.env` file:

```bash
# WhatsApp Business API (Meta Cloud)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_random_verify_token
WHATSAPP_API_VERSION=v21.0
```

## Option 2: Third-Party Providers (Easier Setup)

If you want faster setup, consider these providers:

### Twilio WhatsApp API

1. Sign up at [Twilio](https://www.twilio.com/whatsapp)
2. Get WhatsApp-enabled phone number
3. Add to `.env`:

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 360Dialog

1. Sign up at [360Dialog](https://www.360dialog.com/)
2. Get API key and partner ID
3. Add to `.env`:

```bash
DIALOG_360_API_KEY=your_api_key
DIALOG_360_PARTNER_ID=your_partner_id
```

## Implementation Steps

### 1. Install WhatsApp SDK

```bash
npm install whatsapp-web.js  # For WhatsApp Web (not recommended for production)
# OR
npm install axios  # For direct API calls (recommended)
```

### 2. Create WhatsApp Service

I'll create the service files for you in the next step.

### 3. Create Webhook Endpoint

The webhook will receive incoming messages and status updates.

### 4. Update Message Sending

Modify the ChatWindow component to use WhatsApp API instead of mock sending.

## Testing

### Test with Meta's Test Number

1. Use the test number provided in Meta dashboard
2. Send a message to your test number
3. Check webhook receives the message
4. Reply from your CRM
5. Verify message appears in WhatsApp

### Production Checklist

- [ ] Business verification completed
- [ ] Phone number verified
- [ ] Webhook configured and tested
- [ ] Message templates approved (for proactive messaging)
- [ ] Rate limits understood
- [ ] Error handling implemented
- [ ] Message queue for reliability
- [ ] Logging and monitoring setup

## Rate Limits (Meta Cloud API)

- **Tier 1** (Default): 1,000 business-initiated conversations/day
- **Tier 2**: 10,000 conversations/day
- **Tier 3**: 100,000 conversations/day
- **Tier 4**: Unlimited

Tiers increase automatically based on quality rating and volume.

## Message Templates

For business-initiated messages (outside 24-hour window), you need approved templates:

1. Go to WhatsApp → Message Templates
2. Create template with variables
3. Submit for approval (usually 1-2 hours)
4. Use template name and parameters in API calls

## Next Steps

Run the following command to generate the integration code:

```bash
# I'll create the necessary files for you
```

Would you like me to proceed with creating the WhatsApp integration code?
