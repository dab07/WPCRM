# n8n Setup Complete - Supabase Integration

## ✅ What's Been Done

All n8n workflows have been converted from MongoDB to Supabase PostgreSQL and are ready for use.

## 📦 New Files Created

### Workflow Files (Supabase-Compatible)
- `n8n-workflows/1-lead-nurturing-supabase.json`
- `n8n-workflows/2-abandoned-cart-supabase.json`
- `n8n-workflows/3-feedback-collection-supabase.json`
- `n8n-workflows/4-smart-reengagement-supabase.json`
- `n8n-workflows/5-ai-lead-scoring-supabase.json`

### Documentation
- `n8n-workflows/N8N_SELF_HOSTING_GUIDE.md` - Complete setup guide
- `n8n-workflows/SUPABASE_CONVERSION.md` - Technical conversion details
- `n8n-workflows/QUICK_REFERENCE.md` - Quick reference card
- `n8n-workflows/README.md` - Updated with Supabase workflows

## 🔄 Key Changes

### From MongoDB to Supabase

**Before:**
```javascript
// MongoDB node
{
  "type": "mongodb",
  "operation": "findOne",
  "collection": "contacts",
  "query": "{ \"_id\": { \"$oid\": \"...\" } }"
}
```

**After:**
```javascript
// HTTP Request with Supabase REST API
{
  "type": "httpRequest",
  "method": "GET",
  "url": "{{ $env.SUPABASE_URL }}/rest/v1/contacts?id=eq.uuid"
}
```

### Data Storage

- **IDs**: ObjectId → UUID
- **Flexible Data**: Stored in JSONB `metadata` fields
- **Queries**: MongoDB syntax → PostgREST filters
- **Joins**: `$lookup` → `select=*,table(*)`

## 🚀 Next Steps

### 1. Start n8n (5 minutes)

```bash
# Run n8n locally
npx n8n

# Access at http://localhost:5678
# Create admin account on first launch
```

### 2. Configure Credentials (5 minutes)

**In n8n UI:**
1. Go to **Credentials** → **New**
2. Search for "Supabase API"
3. Add:
   - Name: `Supabase CRM`
   - Host: Your Supabase URL
   - Service Role Key: From Supabase dashboard

**Set Environment Variables:**
```bash
export SUPABASE_URL=https://xxxxx.supabase.co
export GEMINI_API_KEY=your-gemini-api-key
```

### 3. Import Workflows (10 minutes)

**In n8n UI:**
1. Click **Workflows** → **Import from File**
2. Import each `-supabase.json` file
3. Activate each workflow (toggle switch)

### 4. Test Workflows (10 minutes)

```bash
# Test lead nurturing
curl -X POST http://localhost:5678/webhook/lead-nurturing \
  -H "Content-Type: application/json" \
  -d '{"contact_id":"your-uuid","conversation_id":"your-uuid"}'

# Check execution in n8n UI
# Verify data in Supabase
```

### 5. Integrate with CRM (15 minutes)

Update your CRM to call n8n webhooks when:
- New lead created → Lead Nurturing
- Product interest detected → Abandoned Cart
- Purchase completed → Feedback Collection
- New message received → Lead Scoring

## 📊 Workflow Overview

| Workflow | Trigger | Purpose | Webhook URL |
|----------|---------|---------|-------------|
| Lead Nurturing | Webhook | Welcome new leads | `/webhook/lead-nurturing` |
| Abandoned Cart | Webhook | Recover lost sales | `/webhook/abandoned-cart` |
| Feedback Collection | Webhook | Collect feedback | `/webhook/feedback-collection` |
| Smart Re-engagement | Cron (10 AM) | Re-engage inactive | Automatic |
| AI Lead Scoring | Webhook | Score & qualify leads | `/webhook/lead-scoring` |

## 🎯 Features

### AI-Powered
- ✅ Gemini AI for message generation
- ✅ Sentiment analysis
- ✅ Lead scoring (0-100)
- ✅ Intent detection

### Automation
- ✅ Webhook triggers
- ✅ Scheduled tasks (cron)
- ✅ Conditional logic
- ✅ Rate limiting

### Data Management
- ✅ Supabase REST API
- ✅ JSONB metadata storage
- ✅ Workflow execution logging
- ✅ UUID-based IDs

## 📖 Documentation Guide

1. **Start Here**: `n8n-workflows/QUICK_REFERENCE.md` - Quick commands and examples
2. **Full Setup**: `n8n-workflows/N8N_SELF_HOSTING_GUIDE.md` - Complete installation guide
3. **Technical Details**: `n8n-workflows/SUPABASE_CONVERSION.md` - Conversion documentation
4. **Workflow Details**: `n8n-workflows/README.md` - Individual workflow descriptions

## 🔧 Configuration Files

### Your `.env.local` (Add these)
```env
# n8n Configuration
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-api-key-from-n8n

# Already have these
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key
```

### n8n Environment Variables
```bash
# Set before starting n8n
export SUPABASE_URL=https://xxxxx.supabase.co
export GEMINI_API_KEY=your-gemini-api-key
```

## 🎨 Example Use Cases

### 1. New Lead Welcome
```
Customer signs up
    ↓
CRM calls /webhook/lead-nurturing
    ↓
n8n waits 1 hour
    ↓
Generates personalized welcome with AI
    ↓
Sends WhatsApp message
    ↓
Tracks engagement
```

### 2. Abandoned Cart Recovery
```
Customer views product
    ↓
CRM calls /webhook/abandoned-cart
    ↓
n8n waits 2 hours
    ↓
Sends 5% discount reminder
    ↓
Waits 24 hours
    ↓
Sends 10% final offer
```

### 3. AI Lead Scoring
```
Customer sends message
    ↓
CRM calls /webhook/lead-scoring
    ↓
n8n analyzes conversation with AI
    ↓
Calculates lead score
    ↓
If score ≥80 → Assigns to agent
```

## 🐛 Common Issues & Solutions

### "Unauthorized" Error
**Solution**: Check Supabase service role key in credentials

### "Column does not exist"
**Solution**: Run Supabase migration: `supabase/migrations/20241111000001_initial_schema.sql`

### Environment Variable Not Found
**Solution**: Restart n8n after setting variables

### Webhook Returns 404
**Solution**: Ensure workflow is activated (toggle switch in n8n)

### AI Timeout
**Solution**: Check Gemini API key and quota limits

## 📈 Monitoring

### View Executions
1. Open n8n at `http://localhost:5678`
2. Click **Executions** in sidebar
3. See all workflow runs with details

### Check Logs
```bash
# If running with npx
# Check terminal output

# If running with Docker
docker logs n8n-container
```

### Verify Data
```sql
-- Check workflow executions in Supabase
SELECT * FROM workflow_executions 
ORDER BY started_at DESC 
LIMIT 10;

-- Check contact metadata
SELECT id, name, metadata 
FROM contacts 
WHERE metadata->>'lead_score' IS NOT NULL;
```

## 🎉 Success Checklist

- [ ] n8n running at `http://localhost:5678`
- [ ] Admin account created
- [ ] Supabase API credential configured
- [ ] Environment variables set
- [ ] All 5 workflows imported
- [ ] All workflows activated
- [ ] Test webhook returns 200
- [ ] Execution visible in n8n
- [ ] Data appears in Supabase
- [ ] CRM integration working

## 🚀 Production Deployment

When ready for production:

1. **Deploy n8n**:
   - Use Docker: `docker run n8nio/n8n`
   - Or n8n Cloud: https://n8n.io/cloud
   - Or Railway/Heroku

2. **Update Webhook URLs**:
   - Change from `localhost:5678` to your domain
   - Update in CRM trigger configuration

3. **Secure n8n**:
   - Enable basic auth
   - Use HTTPS
   - Restrict API access

4. **Monitor**:
   - Set up error alerts
   - Monitor execution times
   - Track success rates

## 📞 Support Resources

- **n8n Docs**: https://docs.n8n.io
- **Supabase Docs**: https://supabase.com/docs
- **PostgREST API**: https://postgrest.org
- **Gemini AI**: https://ai.google.dev
- **n8n Community**: https://community.n8n.io

## 🎊 You're All Set!

Your n8n workflows are ready to automate your WhatsApp CRM with:
- ✅ AI-powered message generation
- ✅ Automated lead nurturing
- ✅ Smart re-engagement
- ✅ Lead scoring and qualification
- ✅ Feedback collection and analysis

**Total Setup Time**: ~30-45 minutes

**Start with**: `npx n8n` and follow the Quick Reference guide!

---

**Questions?** Check the documentation files in `n8n-workflows/` directory.
