# Twilio WhatsApp - 15 Minute Setup

## Why Twilio?
- ✅ No Meta developer account needed
- ✅ Instant sandbox for testing
- ✅ Free trial credits ($15)
- ✅ Production-ready in minutes
- ✅ Your code already supports it

## Step 1: Sign Up (2 minutes)

1. Go to https://www.twilio.com/try-twilio
2. Sign up with email
3. Verify your phone number
4. You'll get $15 free trial credits

## Step 2: Get Sandbox Access (3 minutes)

1. In Twilio Console, go to: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. You'll see a sandbox number like: `+1 415 523 8886`
3. Join the sandbox:
   - Open WhatsApp on your phone
   - Send the join code (e.g., "join <word>-<word>") to the sandbox number
   - You'll get a confirmation message

## Step 3: Get Your Credentials (2 minutes)

1. Go to Twilio Console home
2. Find these on the dashboard:
   - **Account SID**: Starts with `AC...`
   - **Auth Token**: Click "Show" to reveal

## Step 4: Configure Your App (3 minutes)

Add to your `.env` file:

```bash
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## Step 5: Test Locally (5 minutes)

### Option A: Test Without Webhook (Easiest)

You can send messages immediately without deploying:

```bash
npm run dev
```

Then use your CRM to send a message - it will work!

### Option B: Test With Webhook (Full Integration)

1. **Install ngrok** (if not installed):
   ```bash
   npm install -g ngrok
   ```

2. **Start your app**:
   ```bash
   npm run dev
   ```

3. **In another terminal, start ngrok**:
   ```bash
   ngrok http 3000
   ```

4. **Copy the ngrok URL** (looks like: `https://abc123.ngrok.io`)

5. **Configure Twilio webhook**:
   - Go to: **Messaging** → **Try it out** → **Send a WhatsApp message**
   - Scroll to "Sandbox Configuration"
   - Set "When a message comes in": `https://abc123.ngrok.io/api/webhooks/whatsapp`
   - Save

6. **Test it**:
   - Send a WhatsApp message to the sandbox number
   - Check your CRM - the message should appear!
   - Reply from CRM - it should arrive in WhatsApp

## Step 6: Go to Production (When Ready)

### Get a Production Number

1. Go to: **Messaging** → **WhatsApp** → **Senders**
2. Click "Request to enable my Twilio number for WhatsApp"
3. Fill out the form (business info, use case)
4. Wait for approval (usually 1-3 days)

### Update Your Config

Once approved, update `.env`:

```bash
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890  # Your approved number
```

### Deploy Your Webhook

Deploy to Vercel (recommended):

```bash
npm install -g vercel
vercel --prod
```

Then update Twilio webhook to your production URL:
- Go to your WhatsApp sender settings
- Set webhook: `https://your-app.vercel.app/api/webhooks/whatsapp`

## Testing Checklist

- [ ] Signed up for Twilio
- [ ] Joined sandbox via WhatsApp
- [ ] Added credentials to `.env`
- [ ] Started dev server (`npm run dev`)
- [ ] Sent test message from WhatsApp → appears in CRM
- [ ] Replied from CRM → arrives in WhatsApp
- [ ] AI auto-response working (if enabled)

## Troubleshooting

### "Message not appearing in CRM"
- Check ngrok is running
- Verify webhook URL in Twilio console
- Check browser console for errors
- Look at Twilio logs: Console → Monitor → Logs

### "Can't send from CRM"
- Verify credentials in `.env`
- Check you're using the correct sandbox number
- Ensure you joined the sandbox
- Check Twilio account has credits

### "Webhook verification failed"
- Make sure ngrok URL is correct
- Restart ngrok if URL changed
- Update webhook URL in Twilio

## Pricing (After Free Trial)

- **Conversations**: $0.005 per conversation
- **A conversation** = 24-hour window of messages
- **Example**: 1,000 conversations/month = $5

## Next Steps

1. Test with sandbox (free)
2. Request production number
3. Deploy to Vercel
4. Configure production webhook
5. Start using with real customers!

## Support

- Twilio Docs: https://www.twilio.com/docs/whatsapp
- Twilio Support: support@twilio.com
- Your integration is ready - just add credentials!

---

**Current Status**: Ready to test with Twilio sandbox immediately!
