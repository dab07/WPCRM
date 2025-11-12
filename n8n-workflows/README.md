# n8n Workflows for WhatsApp CRM (Supabase)

This directory contains pre-built n8n workflows for your WhatsApp CRM system, configured for **Supabase PostgreSQL**.

## 📋 Quick Start

1. **Start n8n**: `npx n8n`
2. **Import workflows**: Use the `-supabase.json` files
3. **Configure credentials**: Add Supabase API credentials
4. **Set environment variables**: `SUPABASE_URL`, `GEMINI_API_KEY`
5. **Activate workflows**: Toggle the switch in n8n

## 📦 Available Workflows

### ✅ Supabase Versions (Use These!)

1. **Lead Nurturing Sequence** (`1-lead-nurturing-supabase.json`)
2. **Abandoned Cart Recovery** (`2-abandoned-cart-supabase.json`)
3. **Customer Feedback Collection** (`3-feedback-collection-supabase.json`)
4. **Smart Re-engagement** (`4-smart-reengagement-supabase.json`)
5. **AI Lead Scoring** (`5-ai-lead-scoring-supabase.json`)

### ⚠️ Legacy MongoDB Versions (Deprecated)

Original MongoDB workflows kept for reference only - do not use.

## 📚 Documentation

- **[N8N_SELF_HOSTING_GUIDE.md](./N8N_SELF_HOSTING_GUIDE.md)** - Complete setup guide for self-hosting n8n
- **[SUPABASE_CONVERSION.md](./SUPABASE_CONVERSION.md)** - MongoDB to Supabase conversion details
- **[NPM_SETUP.md](./NPM_SETUP.md)** - npm package installation guide

## 🚀 Workflow Details

### 1. Lead Nurturing Sequence

**Purpose**: Automatically nurture new leads with personalized AI messages

**Flow**:
1. Webhook receives new lead
2. Wait 1 hour
3. Get contact from Supabase
4. Generate welcome message with Gemini AI
5. Send WhatsApp message
6. Wait 24 hours
7. Check engagement
8. Send follow-up based on engagement

**Webhook**: `http://localhost:5678/webhook/lead-nurturing`

**Test**:
```bash
curl -X POST http://localhost:5678/webhook/lead-nurturing \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "uuid-here",
    "conversation_id": "uuid-here"
  }'
```

---

### 2. Abandoned Cart Recovery

**Purpose**: Re-engage customers who showed product interest

**Flow**:
1. Webhook receives product interest event
2. Store in contact metadata
3. Wait 2 hours
4. Check if still interested
5. Send 5% discount reminder
6. Wait 24 hours
7. Check again
8. Send 10% discount final offer

**Webhook**: `http://localhost:5678/webhook/abandoned-cart`

**Test**:
```bash
curl -X POST http://localhost:5678/webhook/abandoned-cart \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "uuid-here",
    "product_id": "123",
    "product_name": "Premium Package"
  }'
```

---

### 3. Customer Feedback Collection

**Purpose**: Collect and analyze feedback after purchase

**Flow**:
1. Webhook receives purchase event
2. Update journey stage
3. Wait 7 days
4. Send feedback request
5. Wait 3 days for response
6. Analyze sentiment with AI
7. Store in contact metadata
8. Alert agent if negative

**Webhook**: `http://localhost:5678/webhook/feedback-collection`

**Test**:
```bash
curl -X POST http://localhost:5678/webhook/feedback-collection \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "uuid-here",
    "product_name": "Test Product"
  }'
```

---

### 4. Smart Re-engagement

**Purpose**: Re-engage inactive customers with personalized messages

**Flow**:
1. Cron triggers daily at 10 AM
2. Find conversations inactive >7 days
3. For each customer:
   - Get conversation history
   - Generate personalized message with AI
   - Send WhatsApp message
   - Log re-engagement

**Schedule**: Daily at 10:00 AM (automatic)

**Manual Test**: Click "Execute Workflow" in n8n

---

### 5. AI Lead Scoring

**Purpose**: Automatically score and qualify leads

**Flow**:
1. Webhook receives new message
2. Get conversation history
3. Analyze with Gemini AI
4. Calculate lead score (0-100)
5. Update contact metadata
6. If score ≥80 → Assign to agent
7. Log scoring event

**Webhook**: `http://localhost:5678/webhook/lead-scoring`

**Test**:
```bash
curl -X POST http://localhost:5678/webhook/lead-scoring \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "uuid-here",
    "conversation_id": "uuid-here"
  }'
```

---

## 🔧 Setup Instructions

### 1. Import Workflows

**Via UI (Recommended)**:
1. Open n8n at `http://localhost:5678`
2. Click **Workflows** → **Import from File**
3. Select a `-supabase.json` file
4. Click **Import**
5. Activate the workflow

**Via API**:
```bash
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  -d @1-lead-nurturing-supabase.json
```

### 2. Configure Credentials

**Supabase API**:
1. Go to **Credentials** → **New**
2. Search for "Supabase API"
3. Add:
   - **Name**: `Supabase CRM`
   - **Host**: `https://xxxxx.supabase.co`
   - **Service Role Key**: From Supabase dashboard

### 3. Set Environment Variables

```bash
# In your shell or n8n config
export SUPABASE_URL=https://xxxxx.supabase.co
export GEMINI_API_KEY=your-gemini-api-key
```

Or add to n8n Docker/config:
```yaml
environment:
  - SUPABASE_URL=https://xxxxx.supabase.co
  - GEMINI_API_KEY=your-gemini-api-key
```

---

## 🎯 Key Features

### Supabase Integration
- REST API-based (no database drivers needed)
- UUID-based IDs
- JSONB metadata for flexible data
- PostgREST filtering

### AI-Powered
- Gemini AI for message generation
- Sentiment analysis
- Lead scoring
- Intent detection

### Automation
- Webhook triggers
- Scheduled tasks (cron)
- Conditional logic
- Rate limiting

---

## 📊 Data Storage

### Contact Metadata (JSONB)
```json
{
  "lead_score": 85,
  "buying_intent": "high",
  "journey_stage": "interest",
  "product_interests": [...],
  "feedback": {...}
}
```

### Conversation Metadata (JSONB)
```json
{
  "priority": "high",
  "last_reengagement_at": "2024-11-12T10:00:00Z",
  "reengagement_count": 3
}
```

### Workflow Executions Table
All workflow runs are logged to `workflow_executions` table with input/output data.

---

## 🔍 Monitoring

### View Executions
1. Click **Executions** in n8n
2. See all workflow runs
3. Debug errors
4. Check data flow

### Check Logs
```bash
# n8n logs
docker logs n8n-container

# Or if running with npx
# Check terminal output
```

---

## 🛠️ Customization

### Modify AI Prompts
Edit the "Generate Message" nodes:
```json
{
  "text": "Your custom prompt here..."
}
```

### Change Timing
Edit "Wait" nodes:
```json
{
  "amount": 2,
  "unit": "hours"
}
```

### Add Conditions
Use "IF" nodes:
```javascript
{{ $json.lead_score > 80 }}
{{ $json.tags.includes('vip') }}
```

---

## 🐛 Troubleshooting

### Workflow Not Triggering
- Check workflow is activated
- Verify webhook URL
- Check n8n logs

### Supabase Connection Failed
- Verify credentials
- Check service role key
- Test API manually

### Gemini API Errors
- Check API key
- Verify rate limits
- Check request format

### Environment Variables Not Found
- Restart n8n after setting
- Check with `echo $SUPABASE_URL`
- Verify in n8n settings

---

## 📖 Additional Resources

- **n8n Documentation**: https://docs.n8n.io
- **Supabase Docs**: https://supabase.com/docs
- **PostgREST API**: https://postgrest.org
- **Gemini AI**: https://ai.google.dev

---

## 🎉 Next Steps

1. ✅ Import all 5 workflows
2. ✅ Configure Supabase credentials
3. ✅ Set environment variables
4. ✅ Test each workflow
5. ✅ Integrate with your CRM
6. ✅ Monitor executions
7. ✅ Customize as needed

**Happy Automating! 🚀**
