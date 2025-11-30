# Deploy to Vercel - Quick Guide

## Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

## Step 2: Deploy on Vercel

1. Go to https://vercel.com/new
2. Sign in with GitHub
3. Click "Import Project"
4. Select your WhatsApp CRM repository
5. Click "Deploy" (Vercel auto-detects Next.js)

## Step 3: Add Environment Variables

After deployment, go to **Project Settings → Environment Variables** and add:

### Required Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIza...
WHATSAPP_PROVIDER=meta
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=whatsapp_crm_verify_token_123
WHATSAPP_API_VERSION=v18.0
```

### Optional (N8N):

```
NEXT_PUBLIC_N8N_API_KEY=eyJ...
N8N_BASE_URL=https://your-n8n-instance.com
N8N_API_KEY_AUTH_ENABLED=true
```

## Step 4: Redeploy

After adding environment variables:
1. Go to "Deployments" tab
2. Click "..." on latest deployment
3. Click "Redeploy"

## Step 5: Configure WhatsApp Webhook

1. Go to https://developers.facebook.com/apps
2. Select your app → WhatsApp → Configuration
3. Edit webhook:
   - **Callback URL:** `https://your-app.vercel.app/api/webhooks/whatsapp`
   - **Verify Token:** `whatsapp_crm_verify_token_123`
4. Click "Verify and Save"
5. Subscribe to fields: `messages`, `message_status`

## Step 6: Test

Send a WhatsApp message to your business number and check:
- Vercel logs (Deployments → View Function Logs)
- Supabase database (messages table)

## Your Vercel URL

After deployment, your app will be at:
```
https://your-app-name.vercel.app
```

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure all dependencies in package.json
- Verify TypeScript has no errors

### Webhook Verification Fails
- Ensure WHATSAPP_WEBHOOK_VERIFY_TOKEN is set in Vercel
- Check the token matches exactly (case-sensitive)
- Verify the URL is correct (no trailing slash)

### Environment Variables Not Working
- Make sure they're added to "Production" environment
- Redeploy after adding variables
- NEXT_PUBLIC_* variables must be set before build

## Next Steps

1. ✅ Test webhook with a message
2. ✅ Test AI responses
3. ✅ Create follow-up rules
4. ✅ Set up campaigns
5. ✅ Configure N8N workflows (optional)

---

**Ready to deploy!** 🚀

Follow the steps above and your WhatsApp CRM will be live in minutes.
