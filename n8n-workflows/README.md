# n8n Workflows for Agentic AI WhatsApp CRM

This directory contains pre-built n8n workflows for your WhatsApp CRM system.

## Available Workflows

### 1. Lead Nurturing Sequence (`1-lead-nurturing.json`)
**Purpose**: Automatically nurture new leads with personalized messages

**Trigger**: Webhook when new contact is created
**Steps**:
1. Wait 1 hour (let them settle in)
2. Get contact details from MongoDB
3. Generate personalized welcome message with Gemini AI
4. Send WhatsApp message
5. Wait 24 hours
6. Check if customer engaged
7. If engaged → Send product information
8. If not engaged → Send re-engagement message
9. Update customer journey stage

**Webhook URL**: `http://localhost:5678/webhook/lead-nurturing`

**Test**:
```bash
curl -X POST http://localhost:5678/webhook/lead-nurturing \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "your_mongodb_contact_id",
    "name": "John Doe",
    "phone_number": "+1234567890"
  }'
```

---

### 2. Abandoned Cart Recovery (`2-abandoned-cart.json`)
**Purpose**: Re-engage customers who showed product interest but didn't purchase

**Trigger**: Webhook when product interest is detected
**Steps**:
1. Store interest event in MongoDB
2. Wait 2 hours
3. Check if purchase was made
4. If no purchase → Generate reminder with 5% discount
5. Send WhatsApp message
6. Wait 24 hours
7. Check again
8. If still no purchase → Generate urgency message with 10% discount
9. Send final offer
10. Update status

**Webhook URL**: `http://localhost:5678/webhook/abandoned-cart`

**Test**:
```bash
curl -X POST http://localhost:5678/webhook/abandoned-cart \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "your_mongodb_contact_id",
    "product_id": "prod_123",
    "product_name": "Premium Package"
  }'
```

---

### 3. Customer Feedback Collection (`3-feedback-collection.json`)
**Purpose**: Automatically collect feedback after purchase

**Trigger**: Webhook when purchase is completed
**Steps**:
1. Update customer journey to "purchase" stage
2. Wait 7 days
3. Generate personalized feedback request
4. Send WhatsApp message
5. Wait for response (3 days)
6. If response received → Analyze sentiment with Gemini
7. Store feedback in MongoDB
8. If negative → Alert agent
9. If positive → Send thank you message

**Webhook URL**: `http://localhost:5678/webhook/feedback-collection`

---

### 4. Smart Re-engagement (`4-smart-reengagement.json`)
**Purpose**: Re-engage inactive customers automatically

**Trigger**: Cron (Daily at 10 AM)
**Steps**:
1. Find customers inactive for >7 days
2. For each customer:
   - Get conversation history
   - Get customer preferences
   - Generate personalized re-engagement message with Gemini
   - Send WhatsApp message
   - Update last contact date
   - Log re-engagement attempt

**Schedule**: Daily at 10:00 AM

---

### 5. AI Lead Scoring (`5-ai-lead-scoring.json`)
**Purpose**: Automatically score and qualify leads

**Trigger**: Webhook on new message
**Steps**:
1. Get conversation history
2. Analyze message with Gemini AI for buying intent
3. Calculate lead score based on:
   - Message frequency
   - Sentiment analysis
   - Keywords detected
   - Engagement level
   - Response time
4. Update lead score in MongoDB
5. If score > 80 → Assign to sales agent
6. Send notification to agent

**Webhook URL**: `http://localhost:5678/webhook/lead-scoring`

---

## How to Import Workflows

### Method 1: Via n8n UI (Recommended)

1. Open n8n: `http://localhost:5678`
2. Click **Workflows** in the left sidebar
3. Click **Import from File**
4. Select a workflow JSON file from this directory
5. Click **Import**
6. The workflow will open in the editor
7. Click **Save**

### Method 2: Via API

```bash
# Import workflow via n8n API
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: your_api_key" \
  -H "Content-Type: application/json" \
  -d @1-lead-nurturing.json
```

### Method 3: Copy-Paste

1. Open the JSON file in a text editor
2. Copy the entire content
3. In n8n, click **Workflows** → **Add Workflow**
4. Click the **⋮** menu → **Import from URL or File**
5. Paste the JSON content
6. Click **Import**

---

## Configuration Required

After importing workflows, you need to configure:

### 1. MongoDB Credentials

1. Go to **Credentials** in n8n
2. Click **Add Credential**
3. Search for "MongoDB"
4. Fill in:
   - **Connection String**: Your MongoDB URI from `.env`
   - **Database**: `whatsapp-crm`
5. Click **Save**
6. Name it: "MongoDB WhatsApp CRM"

### 2. Environment Variables

Make sure these are set in your `n8n-docker-compose.yml`:
```yaml
environment:
  - GEMINI_API_KEY=your_gemini_api_key
  - MONGODB_URI=your_mongodb_uri
  - WHATSAPP_API_TOKEN=your_whatsapp_token
```

### 3. Update Webhook URLs

In each workflow, update the HTTP Request nodes with your actual server URL:
- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

---

## Testing Workflows

### Test Individual Nodes

1. Open a workflow
2. Click on any node
3. Click **Execute Node** button
4. Check the output in the right panel

### Test Entire Workflow

1. Click **Execute Workflow** button (top right)
2. Provide test data if needed
3. Watch the execution flow
4. Check results in each node

### Test Webhooks

Use curl or Postman:
```bash
# Test lead nurturing
curl -X POST http://localhost:5678/webhook/lead-nurturing \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "673e5f8a9b1c2d3e4f5a6b7c",
    "name": "Test User",
    "phone_number": "+1234567890"
  }'
```

---

## Customizing Workflows

### Modify AI Prompts

In "Generate Message" nodes, update the Gemini AI prompt:
```json
{
  "contents": [{
    "parts": [{
      "text": "Your custom prompt here..."
    }]
  }]
}
```

### Change Timing

In "Wait" nodes, adjust the duration:
- Hours: `{ "amount": 2, "unit": "hours" }`
- Days: `{ "amount": 3, "unit": "days" }`
- Minutes: `{ "amount": 30, "unit": "minutes" }`

### Add Conditions

Use "IF" nodes to add conditional logic:
```javascript
// Check if customer is VIP
{{ $json.tags.includes('vip') }}

// Check message count
{{ $json.message_count > 5 }}

// Check last interaction
{{ $now.diff($json.last_interaction, 'days') > 7 }}
```

---

## Monitoring Workflows

### View Executions

1. Click **Executions** in n8n
2. See all workflow runs
3. Click on any execution to see details
4. Debug errors and check data flow

### Enable Logging

Add "Set" nodes to log data:
```javascript
// Log to console
console.log('Customer:', $json.name);
console.log('Stage:', $json.stage);
```

### Error Handling

Add "Error Trigger" node:
1. Catches workflow errors
2. Sends alert to admin
3. Logs error to MongoDB

---

## Best Practices

### 1. Use Descriptive Names
- Workflow: "Lead Nurturing - Welcome Sequence"
- Nodes: "Get Contact from MongoDB", "Generate AI Message"

### 2. Add Notes
- Right-click node → Add Note
- Document complex logic
- Explain business rules

### 3. Test Before Activating
- Test with sample data
- Verify all nodes work
- Check MongoDB updates

### 4. Monitor Performance
- Check execution times
- Optimize slow queries
- Add indexes if needed

### 5. Version Control
- Export workflows regularly
- Store in Git
- Track changes

---

## Troubleshooting

### Workflow Not Triggering
- Check webhook URL is correct
- Verify workflow is activated (toggle switch)
- Check n8n logs: `docker logs n8n-whatsapp-crm`

### MongoDB Connection Failed
- Verify connection string in credentials
- Check IP whitelist in MongoDB Atlas
- Test connection outside n8n

### Gemini API Errors
- Check API key is set in environment
- Verify rate limits not exceeded
- Check request format

### Messages Not Sending
- Verify WhatsApp API credentials
- Check phone number format
- Test API endpoint separately

---

## Creating New Workflows

### Template Structure

```
Trigger (Webhook/Cron)
    ↓
Get Data (MongoDB)
    ↓
Process with AI (Gemini)
    ↓
Take Action (Send Message)
    ↓
Update Database (MongoDB)
    ↓
Log Result
```

### Common Nodes

- **Webhook**: Receive external triggers
- **Cron**: Schedule recurring tasks
- **MongoDB**: Database operations
- **HTTP Request**: API calls (Gemini, WhatsApp)
- **Code**: Custom JavaScript logic
- **IF**: Conditional branching
- **Wait**: Delay execution
- **Set**: Transform data

---

## Support

- **n8n Documentation**: https://docs.n8n.io
- **Community Forum**: https://community.n8n.io
- **GitHub Issues**: https://github.com/n8n-io/n8n/issues

---

**Happy Automating! 🚀**