# Setup Checklist

Use this checklist to track your WhatsApp CRM setup progress.

## ✅ Prerequisites

- [ ] Node.js 20+ installed
- [ ] npm or yarn installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

## 📦 Installation

- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created from `.env.example`

## 🗄️ Database Setup

- [ ] Supabase account created
- [ ] Supabase project created
- [ ] Project URL added to `.env`
- [ ] Anon key added to `.env`
- [ ] Service role key added to `.env`
- [ ] Migrations run (`npm run db:push` or manual)
- [ ] Seed data inserted (optional)
- [ ] Database connection tested

## 🤖 Gemini AI Setup

- [ ] Google AI Studio account created
- [ ] Gemini API key generated
- [ ] API key added to `.env`
- [ ] API tested (send test request)

## 📱 WhatsApp Business API Setup

### Meta Developer Account
- [ ] Meta Developer account created
- [ ] Business app created
- [ ] WhatsApp product added to app
- [ ] Test phone number added
- [ ] Business verification started (if needed)

### API Credentials
- [ ] Phone Number ID obtained
- [ ] Business Account ID obtained
- [ ] Permanent access token generated
- [ ] All credentials added to `.env`

### Webhook Configuration
- [ ] Webhook verify token created (random string)
- [ ] Verify token added to `.env`
- [ ] Application deployed (or ngrok for local testing)
- [ ] Webhook URL configured in Meta dashboard
- [ ] Webhook verified successfully
- [ ] Subscribed to `messages` events
- [ ] Subscribed to `message_status` events

## 🔧 n8n Setup (Optional)

- [ ] n8n installed (`npx n8n`)
- [ ] n8n running (localhost:5678)
- [ ] n8n API key generated
- [ ] API key added to `.env`
- [ ] Follow-up scheduler workflow imported
- [ ] Webhook receiver workflow imported (if needed)
- [ ] Campaign executor workflow imported
- [ ] Workflows activated

## 🧪 Testing

### Basic Tests
- [ ] Application starts (`npm run dev`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No linting errors (`npm run lint`)
- [ ] Database connection works

### WhatsApp Tests
- [ ] Webhook verification works
- [ ] Can receive WhatsApp messages
- [ ] Messages saved to database
- [ ] Can send WhatsApp messages
- [ ] Message status updates received

### AI Tests
- [ ] AI responses generated
- [ ] Intent detection works
- [ ] Business card extraction from text works
- [ ] Business card extraction from image works

### Automation Tests
- [ ] Follow-up rules created
- [ ] Follow-up endpoint works
- [ ] Campaign created
- [ ] Campaign execution works

## 🚀 Deployment

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Production domain ready

### Deployment Platform
- [ ] Platform chosen (Vercel/Railway/other)
- [ ] Account created
- [ ] Project connected
- [ ] Environment variables set
- [ ] Application deployed
- [ ] Deployment successful

### Post-Deployment
- [ ] Production URL accessible
- [ ] Webhook URL updated in Meta dashboard
- [ ] Webhook verified in production
- [ ] Test message sent in production
- [ ] Database connection works in production
- [ ] Monitoring enabled
- [ ] Error tracking configured

## 📊 Configuration

### Follow-up Rules
- [ ] Default 3-day rule created
- [ ] Custom rules added (if needed)
- [ ] Rules activated

### AI Intents
- [ ] Default intents seeded
- [ ] Custom intents added (if needed)
- [ ] Confidence thresholds configured

### Campaigns
- [ ] Sample campaign created
- [ ] Target tags configured
- [ ] Message templates ready

## 📚 Documentation Review

- [ ] README.md read
- [ ] SETUP_GUIDE.md reviewed
- [ ] TESTING_GUIDE.md reviewed
- [ ] QUICK_REFERENCE.md bookmarked
- [ ] ARCHITECTURE.md understood

## 🔐 Security

- [ ] `.env` file in `.gitignore`
- [ ] Secrets not committed to Git
- [ ] Access tokens are permanent (not temporary)
- [ ] Webhook verify token is strong
- [ ] Service role key secured
- [ ] Production secrets different from development

## 📈 Monitoring

- [ ] Application logs accessible
- [ ] Database monitoring enabled
- [ ] Error tracking configured
- [ ] Webhook health monitored
- [ ] Message delivery tracked

## 🎯 Final Checks

- [ ] Can receive messages from customers
- [ ] AI responds automatically
- [ ] Business cards can be captured
- [ ] Follow-ups send automatically
- [ ] Campaigns can be executed
- [ ] Dashboard accessible
- [ ] All features working

## 🎉 Launch Ready!

Once all items are checked, you're ready to launch!

## 📝 Notes

Use this space to track any issues or customizations:

```
Date: ___________
Issues encountered:


Solutions applied:


Custom configurations:


```

## 🆘 Need Help?

If stuck on any step:

1. Check the detailed guides:
   - [Setup Guide](guides/SETUP_GUIDE.md)
   - [Testing Guide](guides/TESTING_GUIDE.md)
   - [Quick Reference](guides/QUICK_REFERENCE.md)

2. Review logs:
   ```bash
   # Application logs
   npm run dev
   
   # Database logs
   # Check Supabase dashboard
   
   # WhatsApp logs
   # Check Meta Developer Console
   ```

3. Test individual components:
   ```bash
   # Test webhook
   curl "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"
   
   # Test Gemini
   curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
   ```

4. Common issues:
   - **Webhook not working:** Check URL and verify token
   - **Messages not sending:** Verify access token
   - **AI not responding:** Check Gemini API key
   - **Database errors:** Check connection string

## 🔄 Maintenance Checklist

After launch, perform these tasks regularly:

### Daily
- [ ] Check error logs
- [ ] Monitor message delivery rates
- [ ] Review AI response quality

### Weekly
- [ ] Review campaign performance
- [ ] Check follow-up effectiveness
- [ ] Analyze conversation metrics
- [ ] Update AI intents if needed

### Monthly
- [ ] Review and rotate secrets
- [ ] Update dependencies
- [ ] Backup database
- [ ] Review costs and usage
- [ ] Optimize performance
