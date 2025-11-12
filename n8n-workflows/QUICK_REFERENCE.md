# n8n Supabase Quick Reference

## 🚀 Quick Start Commands

```bash
# Start n8n
npx n8n

# Access n8n
open http://localhost:5678

# Set environment variables
export SUPABASE_URL=https://xxxxx.supabase.co
export GEMINI_API_KEY=your-key
```

## 📁 Files to Import

Use these Supabase-compatible workflows:
- ✅ `1-lead-nurturing-supabase.json`
- ✅ `2-abandoned-cart-supabase.json`
- ✅ `3-feedback-collection-supabase.json`
- ✅ `4-smart-reengagement-supabase.json`
- ✅ `5-ai-lead-scoring-supabase.json`

## 🔑 Credentials Setup

**Supabase API Credential:**
- Name: `Supabase CRM`
- Host: `https://xxxxx.supabase.co`
- Service Role Key: From Supabase dashboard → Settings → API

## 🌐 Webhook URLs

```
Lead Nurturing:     http://localhost:5678/webhook/lead-nurturing
Abandoned Cart:     http://localhost:5678/webhook/abandoned-cart
Feedback:           http://localhost:5678/webhook/feedback-collection
Lead Scoring:       http://localhost:5678/webhook/lead-scoring
Re-engagement:      Cron (automatic daily at 10 AM)
```

## 📊 Supabase REST API Cheat Sheet

### GET (Read)
```javascript
// Single record
GET /rest/v1/contacts?id=eq.uuid

// Multiple with filter
GET /rest/v1/conversations?status=eq.active&last_message_at=lte.2024-01-01

// With join
GET /rest/v1/conversations?select=*,contacts(*)

// Count
GET /rest/v1/messages?conversation_id=eq.uuid&select=count

// Order and limit
GET /rest/v1/messages?order=created_at.desc&limit=20
```

### POST (Create)
```javascript
POST /rest/v1/workflow_executions
Body: {
  "contact_id": "uuid",
  "workflow_name": "lead_scoring",
  "status": "completed"
}
```

### PATCH (Update)
```javascript
PATCH /rest/v1/contacts?id=eq.uuid
Body: {
  "metadata": {
    "lead_score": 85
  }
}
```

## 🔍 PostgREST Filters

| Filter | Example | Description |
|--------|---------|-------------|
| `eq` | `?id=eq.123` | Equal to |
| `neq` | `?status=neq.closed` | Not equal |
| `gt` | `?score=gt.80` | Greater than |
| `gte` | `?created_at=gte.2024-01-01` | Greater or equal |
| `lt` | `?score=lt.50` | Less than |
| `lte` | `?last_message_at=lte.2024-01-01` | Less or equal |
| `like` | `?name=like.*John*` | Pattern match |
| `in` | `?status=in.(active,pending)` | In list |

## 💾 JSONB Metadata Examples

### Contact Metadata
```json
{
  "metadata": {
    "lead_score": 85,
    "buying_intent": "high",
    "journey_stage": "interest",
    "product_interests": [
      {
        "product_id": "123",
        "product_name": "Widget",
        "status": "interested",
        "detected_at": "2024-11-12T10:00:00Z"
      }
    ],
    "feedback": {
      "sentiment": "positive",
      "themes": ["quality", "service"],
      "summary": "Great experience",
      "analyzed_at": "2024-11-12T10:00:00Z"
    },
    "last_scored_at": "2024-11-12T10:00:00Z"
  }
}
```

### Conversation Metadata
```json
{
  "metadata": {
    "priority": "high",
    "last_reengagement_at": "2024-11-12T10:00:00Z",
    "reengagement_count": 3,
    "auto_assigned": true,
    "assigned_reason": "high_lead_score"
  }
}
```

## 🧪 Test Commands

### Lead Nurturing
```bash
curl -X POST http://localhost:5678/webhook/lead-nurturing \
  -H "Content-Type: application/json" \
  -d '{"contact_id":"uuid","conversation_id":"uuid"}'
```

### Abandoned Cart
```bash
curl -X POST http://localhost:5678/webhook/abandoned-cart \
  -H "Content-Type: application/json" \
  -d '{"contact_id":"uuid","product_id":"123","product_name":"Widget"}'
```

### Feedback Collection
```bash
curl -X POST http://localhost:5678/webhook/feedback-collection \
  -H "Content-Type: application/json" \
  -d '{"contact_id":"uuid","product_name":"Widget"}'
```

### Lead Scoring
```bash
curl -X POST http://localhost:5678/webhook/lead-scoring \
  -H "Content-Type: application/json" \
  -d '{"contact_id":"uuid","conversation_id":"uuid"}'
```

## 🔧 Common n8n Expressions

### Access Environment Variables
```javascript
{{ $env.SUPABASE_URL }}
{{ $env.GEMINI_API_KEY }}
```

### Date/Time
```javascript
{{ $now.toISO() }}
{{ $now.minus({days: 7}).toISO() }}
{{ $now.plus({hours: 24}).toISO() }}
```

### JSON Operations
```javascript
{{ JSON.stringify($json.array) }}
{{ JSON.parse($json.string) }}
```

### Array Operations
```javascript
{{ $json.tags.join(', ') }}
{{ $json.messages.map(m => m.content).join('\n') }}
{{ $json.items.filter(i => i.status === 'active') }}
```

### Conditional
```javascript
{{ $json.score > 80 ? 'high' : 'low' }}
{{ $json.tags.includes('vip') }}
```

## 🎯 Workflow Execution Order

1. **Lead Nurturing**: Webhook → Wait → Get Contact → AI → Send → Wait → Check → Follow-up
2. **Abandoned Cart**: Webhook → Store → Wait → Check → Remind → Wait → Check → Final Offer
3. **Feedback**: Webhook → Update → Wait → Request → Wait → Analyze → Store → Action
4. **Re-engagement**: Cron → Find Inactive → Loop (Get History → AI → Send → Log)
5. **Lead Scoring**: Webhook → Get History → AI Analyze → Score → Assign if High → Log

## 📋 Checklist

### Initial Setup
- [ ] Start n8n (`npx n8n`)
- [ ] Create admin account
- [ ] Generate API key
- [ ] Add to `.env.local`: `N8N_BASE_URL`, `N8N_API_KEY`

### Credentials
- [ ] Add Supabase API credential
- [ ] Set `SUPABASE_URL` environment variable
- [ ] Set `GEMINI_API_KEY` environment variable

### Import Workflows
- [ ] Import `1-lead-nurturing-supabase.json`
- [ ] Import `2-abandoned-cart-supabase.json`
- [ ] Import `3-feedback-collection-supabase.json`
- [ ] Import `4-smart-reengagement-supabase.json`
- [ ] Import `5-ai-lead-scoring-supabase.json`

### Configure Each Workflow
- [ ] Update Supabase credential reference
- [ ] Verify webhook URLs
- [ ] Test with sample data
- [ ] Activate workflow

### Integration
- [ ] Update CRM to call n8n webhooks
- [ ] Test trigger from CRM
- [ ] Monitor execution logs
- [ ] Verify data in Supabase

## 🐛 Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| Unauthorized | Check Supabase service role key |
| Column not found | Run Supabase migration |
| Env var not found | Restart n8n after setting |
| Webhook 404 | Check workflow is activated |
| JSONB error | Ensure valid JSON structure |
| AI timeout | Check Gemini API key & quota |

## 📚 Documentation Links

- **Full Setup Guide**: [N8N_SELF_HOSTING_GUIDE.md](./N8N_SELF_HOSTING_GUIDE.md)
- **Conversion Details**: [SUPABASE_CONVERSION.md](./SUPABASE_CONVERSION.md)
- **Workflow Details**: [README.md](./README.md)

## 🎉 Success Indicators

✅ All 5 workflows imported
✅ Supabase credential configured
✅ Environment variables set
✅ Test webhooks return 200
✅ Executions visible in n8n
✅ Data appears in Supabase
✅ AI messages generated
✅ WhatsApp messages sent

---

**Need Help?** Check the full guides or n8n execution logs for detailed error messages.
