# Vercel Deployment Guide

## Quick Start (Manual Deployment via Vercel Website)

### Step 1: Prepare Your Repository

1. **Commit all changes:**
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Deploy on Vercel

1. Go to https://vercel.com/new
2. Sign in with GitHub
3. Click "Import Project"
4. Select your WhatsApp CRM repository
5. Vercel will auto-detect Next.js - click "Deploy"

### Step 3: Configure Environment Variables

After initial deployment, go to your project dashboard:

1. Click "Settings" → "Environment Variables"
2. Add these **required** variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
GEMINI_API_KEY=AIzaxxx...
WHATSAPP_PROVIDER=meta
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAABxxx...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_random_token_123
WHATSAPP_API_VERSION=v18.0
```

3. **Optional N8N variables** (if using workflow automation):
```
NEXT_PUBLIC_N8N_API_KEY=eyJxxx...
N8N_BASE_URL=https://your-n8n-instance.com
N8N_API_KEY_AUTH_ENABLED=true
```

4. Click "Save" for each variable
5. Redeploy: Go to "Deployments" → Click "..." on latest → "Redeploy"

### Step 4: Update WhatsApp Webhook

1. Go to [Meta Developer Console](https://developers.facebook.com/apps)
2. Select your app → WhatsApp → Configuration
3. Update webhook URL to: `https://your-app.vercel.app/api/webhooks/whatsapp`
4. Verify token: Use the same value as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
5. Subscribe to: `messages`, `message_status`

### Step 5: Test Your Deployment

1. **Check health endpoint:**
```bash
curl https://your-app.vercel.app/api/health
```

2. **Send a test WhatsApp message** to your business number

3. **Check Vercel logs:**
   - Go to your project dashboard
   - Click "Deployments" → Latest deployment → "View Function Logs"

4. **Verify in Supabase:**
   - Check `messages` table for new entries
   - Check `conversations` table

## Common Issues & Solutions

### Build Fails

**Error: TypeScript errors**
```bash
# Run locally first to catch errors
npm run typecheck
npm run build
```

**Error: Missing dependencies**
```bash
# Ensure package.json is committed
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Environment Variables Not Working

- Make sure variables are added to "Production" environment
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)
- For `NEXT_PUBLIC_*` variables, they must be set before build

### Webhook Not Receiving Messages

1. **Verify webhook URL** in Meta console matches Vercel URL
2. **Check verify token** matches exactly
3. **Test webhook manually:**
```bash
curl -X POST https://your-app.vercel.app/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Database Connection Issues

- Verify Supabase URL and keys are correct
- Check Supabase project is not paused (free tier pauses after inactivity)
- Ensure database migrations are run

## Performance Tips

### Enable Vercel Analytics

1. Go to project dashboard
2. Click "Analytics" tab
3. Enable Web Analytics (free)

### Configure Caching

The `vercel.json` file is already configured for optimal caching.

### Monitor Function Execution

- Check "Functions" tab in Vercel dashboard
- Monitor execution time and errors
- Upgrade plan if hitting limits

## Scaling Considerations

### Vercel Free Tier Limits:
- 100GB bandwidth/month
- 100 hours serverless function execution
- 6,000 minutes build time

### When to Upgrade:
- High message volume (>1000/day)
- Multiple concurrent users
- Heavy AI processing
- Need for custom domains

## Security Checklist

- [ ] All environment variables set in Vercel (not in code)
- [ ] `.env` file in `.gitignore`
- [ ] Webhook verify token is strong and random
- [ ] Supabase RLS policies enabled
- [ ] Access tokens are permanent (not temporary)
- [ ] HTTPS enabled (automatic on Vercel)

## Maintenance

### Update Deployment

```bash
git add .
git commit -m "Update feature"
git push origin main
# Vercel auto-deploys on push
```

### Rollback Deployment

1. Go to "Deployments" tab
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### View Logs

1. Go to project dashboard
2. Click "Deployments" → Latest
3. Click "View Function Logs"
4. Filter by function or time range

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support
- **Community:** https://github.com/vercel/vercel/discussions

## Next Steps

After successful deployment:

1. ✅ Test all features in production
2. ✅ Set up monitoring and alerts
3. ✅ Configure custom domain (optional)
4. ✅ Enable Vercel Analytics
5. ✅ Set up N8N workflows (if using)
6. ✅ Train your team on the system
7. ✅ Start sending messages!

---

**Your app is now live! 🚀**

Access it at: `https://your-app.vercel.app`
