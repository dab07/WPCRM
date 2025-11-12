# MongoDB to Supabase Workflow Conversion

## Overview

All n8n workflows have been converted from MongoDB to Supabase PostgreSQL. The new workflows use Supabase's REST API instead of MongoDB nodes.

## What Changed

### Database Access Method

**Before (MongoDB):**
```json
{
  "type": "n8n-nodes-base.mongodb",
  "operation": "findOne",
  "collection": "contacts",
  "query": "{ \"_id\": { \"$oid\": \"{{ $json.contact_id }}\" } }"
}
```

**After (Supabase):**
```json
{
  "type": "n8n-nodes-base.httpRequest",
  "method": "GET",
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/contacts",
  "queryParameters": {
    "parameters": [
      { "name": "id", "value": "=eq.{{ $json.contact_id }}" }
    ]
  }
}
```

### Key Differences

| Aspect | MongoDB | Supabase |
|--------|---------|----------|
| **Node Type** | `mongodb` | `httpRequest` |
| **ID Format** | ObjectId (`_id`) | UUID (`id`) |
| **Queries** | MongoDB query syntax | PostgREST filters |
| **Joins** | `$lookup` aggregation | `select=*,table(*)` |
| **Updates** | `update` operation | PATCH request |
| **Inserts** | `insert` operation | POST request |

## Converted Workflows

### 1. Lead Nurturing Sequence
**File:** `1-lead-nurturing-supabase.json`

**Changes:**
- Contact lookup via REST API with `eq.` filter
- Message count using Supabase count query
- Journey stage stored in `metadata` JSONB field
- UUID-based contact IDs instead of ObjectId

### 2. Abandoned Cart Recovery
**File:** `2-abandoned-cart-supabase.json`

**Changes:**
- Product interests stored in contact `metadata` JSONB
- Status checks via GET requests with filters
- No separate `product_interests` collection needed
- Uses JSONB array for tracking multiple products

### 3. Customer Feedback Collection
**File:** `3-feedback-collection-supabase.json`

**Changes:**
- Feedback stored in contact `metadata` JSONB
- Message queries with `gte.` date filters
- Sentiment analysis results in structured JSONB
- No separate `feedback` collection

### 4. Smart Re-engagement
**File:** `4-smart-reengagement-supabase.json`

**Changes:**
- Cron-triggered daily at 10 AM
- Conversation lookup with `lte.` date filter for inactivity
- Embedded contact data via `select=*,contacts(*)`
- Re-engagement tracking in conversation `metadata`
- Logs to `workflow_executions` table

### 5. AI Lead Scoring
**File:** `5-ai-lead-scoring-supabase.json`

**Changes:**
- Lead scores stored in contact `metadata`
- Conversation status updates via PATCH
- High-quality leads trigger agent assignment
- Complete scoring data logged to `workflow_executions`

## Supabase REST API Patterns

### Filtering

```javascript
// Equal
"?id=eq.123"

// Greater than or equal
"?created_at=gte.2024-01-01"

// Less than or equal
"?last_message_at=lte.2024-01-01"

// Multiple filters
"?status=eq.active&last_message_at=lte.2024-01-01"
```

### Selecting with Joins

```javascript
// Get conversation with embedded contact
"?select=*,contacts(*)"

// Specific fields only
"?select=id,name,phone_number"
```

### Ordering and Limiting

```javascript
// Order by created_at descending
"?order=created_at.desc"

// Limit results
"?limit=50"

// Combined
"?order=created_at.desc&limit=20"
```

### Counting

```javascript
// Get count instead of data
"?select=count"
```

### Updating (PATCH)

```json
{
  "method": "PATCH",
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/contacts?id=eq.{{ $json.contact_id }}",
  "body": {
    "metadata": {
      "lead_score": 85,
      "buying_intent": "high"
    }
  }
}
```

### Inserting (POST)

```json
{
  "method": "POST",
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/workflow_executions",
  "body": {
    "contact_id": "{{ $json.contact_id }}",
    "workflow_name": "lead_scoring",
    "status": "completed"
  }
}
```

## JSONB Metadata Usage

Since Supabase uses PostgreSQL, we leverage JSONB fields for flexible data:

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
      "summary": "Great experience"
    }
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
    "auto_assigned": true
  }
}
```

## Required Environment Variables

Set these in n8n:

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
```

## Credential Setup in n8n

### Supabase API Credential

1. Go to **Credentials** → **New**
2. Search for **Supabase API**
3. Configure:
   - **Name**: `Supabase CRM`
   - **Host**: `https://xxxxx.supabase.co`
   - **Service Role Key**: Your service role key

All workflows reference this credential as `"id": "1", "name": "Supabase CRM"`.

## Testing Workflows

### 1. Test Lead Nurturing

```bash
curl -X POST http://localhost:5678/webhook/lead-nurturing \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "your-contact-uuid",
    "conversation_id": "your-conversation-uuid"
  }'
```

### 2. Test Abandoned Cart

```bash
curl -X POST http://localhost:5678/webhook/abandoned-cart \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "your-contact-uuid",
    "product_id": "123",
    "product_name": "Test Product"
  }'
```

### 3. Test Feedback Collection

```bash
curl -X POST http://localhost:5678/webhook/feedback-collection \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "your-contact-uuid",
    "product_name": "Test Product"
  }'
```

### 4. Test Lead Scoring

```bash
curl -X POST http://localhost:5678/webhook/lead-scoring \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "your-contact-uuid",
    "conversation_id": "your-conversation-uuid"
  }'
```

### 5. Smart Re-engagement

This workflow runs automatically via cron (daily at 10 AM). To test manually:
1. Open the workflow in n8n
2. Click **Execute Workflow** button

## Migration Benefits

1. **No MongoDB Required**: Uses your existing Supabase database
2. **Simpler Setup**: REST API instead of database drivers
3. **Better Integration**: Direct access to your CRM data
4. **JSONB Flexibility**: Store complex data without schema changes
5. **UUID Standard**: Consistent with your existing schema
6. **Real-time Ready**: Can add Supabase Realtime subscriptions later

## Troubleshooting

### Workflow Fails with "Unauthorized"

- Check Supabase credentials in n8n
- Verify service role key is correct
- Ensure RLS is disabled or service role bypasses it

### "Column does not exist" Error

- Check your Supabase schema matches expected tables
- Run migration: `supabase/migrations/20241111000001_initial_schema.sql`

### JSONB Field Not Updating

- Ensure you're using PATCH, not POST
- Check JSONB structure is valid JSON
- Use `JSON.stringify()` for arrays in expressions

### Environment Variables Not Found

- Set `SUPABASE_URL` and `GEMINI_API_KEY` in n8n
- Restart n8n after adding environment variables
- Check with: `echo $SUPABASE_URL`

## Next Steps

1. ✅ Import all 5 Supabase workflows
2. ✅ Configure Supabase API credentials
3. ✅ Set environment variables
4. ✅ Test each workflow with sample data
5. ✅ Monitor execution logs in n8n
6. ✅ Integrate with your CRM trigger system
7. ✅ Set up webhook endpoints in your Next.js app

## Support

For issues:
- Check n8n execution logs
- Verify Supabase API responses
- Test queries directly in Supabase SQL editor
- Review PostgREST documentation: https://postgrest.org
