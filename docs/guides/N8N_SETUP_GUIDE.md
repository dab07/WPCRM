# n8n Setup Guide for Agentic AI WhatsApp CRM

## What is n8n?

n8n is a **FREE, open-source workflow automation tool** that lets you create complex automation workflows visually. Think of it as "Zapier but free and self-hosted."

### Why n8n for Your Agentic AI CRM?
- ✅ **FREE & Open Source** - No monthly fees
- ✅ **Visual Workflow Builder** - Drag-and-drop interface
- ✅ **500+ Integrations** - Connect to any service
- ✅ **Self-Hosted** - Full control over your data
- ✅ **AI-Friendly** - Built-in AI nodes and webhooks
- ✅ **Unlimited Workflows** - No limits on automation

## Installation Options

### Option 1: Docker (Recommended - Easiest)

#### Prerequisites
- Docker installed on your machine
- 2GB RAM minimum
- 10GB disk space

#### Quick Start with Docker

1. **Create n8n directory**
```bash
mkdir n8n-data
cd n8n-data
```

2. **Run n8n with Docker**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

3. **Access n8n**
- Open browser: `http://localhost:5678`
- Create your account (stored locally)
- Start building workflows!

#### Docker Compose (Production Setup)

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    container_name: n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your_secure_password
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
      - GENERIC_TIMEZONE=America/New_York
    volumes:
      - ~/.n8n:/home/node/.n8n
```

Start n8n:
```bash
docker-compose up -d
```

### Option 2: npm (For Developers)

```bash
# Install n8n globally
npm install n8n -g

# Start n8n
n8n start

# Access at http://localhost:5678
```

### Option 3: n8n Cloud (Easiest but Paid)

- Visit [n8n.cloud](https://n8n.cloud)
- Free trial available
- $20/month for starter plan
- No setup required

## Connecting n8n to Your WhatsApp CRM

### Step 1: Get n8n API Key

1. Open n8n: `http://localhost:5678`
2. Click your profile (bottom left)
3. Go to **Settings** → **API**
4. Click **Create API Key**
5. Name it: "WhatsApp CRM"
6. Copy the API key

### Step 2: Configure Environment Variables

Add to your `.env` file:
```env
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key_here
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

### Step 3: Create MongoDB Connection in n8n

1. In n8n, click **Credentials** (left sidebar)
2. Click **Add Credential**
3. Search for "MongoDB"
4. Fill in:
   - **Connection String**: Your MongoDB URI
   - **Database**: `whatsapp-crm`
5. Click **Save**

### Step 4: Create HTTP Request Credential

1. Click **Add Credential**
2. Search for "HTTP Request"
3. Name it: "WhatsApp CRM API"
4. Authentication: **Generic Credential Type**
5. Add header:
   - Name: `Authorization`
   - Value: `Bearer your_jwt_token`
6. Click **Save**

## Pre-Built Workflows for Your CRM

### Workflow 1: Lead Nurturing Sequence

**Purpose**: Automatically nurture new leads with a sequence of messages

#### Workflow Structure:
```
Webhook Trigger (New Contact)
    ↓
Wait 1 Hour
    ↓
MongoDB: Get Contact Details
    ↓
Gemini AI: Generate Welcome Message
    ↓
HTTP Request: Send WhatsApp Message
    ↓
Wait 24 Hours
    ↓
MongoDB: Check Engagement
    ↓
IF Engaged → Send Product Info
    ↓
IF Not Engaged → Send Different Approach
    ↓
Wait 3 Days
    ↓
MongoDB: Update Customer Journey Stage
```

#### Import This Workflow:

Create `workflows/lead-nurturing.json`:
```json
{
  "name": "Lead Nurturing Sequence",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "lead-nurturing",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "amount": 1,
        "unit": "hours"
      },
      "name": "Wait 1 Hour",
      "type": "n8n-nodes-base.wait",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "operation": "findOne",
        "collection": "contacts",
        "query": "={ \"_id\": \"{{ $json.contact_id }}\" }"
      },
      "name": "Get Contact",
      "type": "n8n-nodes-base.mongodb",
      "typeVersion": 1,
      "position": [650, 300],
      "credentials": {
        "mongodb": {
          "name": "MongoDB WhatsApp CRM"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpQueryAuth",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "key",
              "value": "={{ $env.GEMINI_API_KEY }}"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "contents",
              "value": "={{ [{\"parts\": [{\"text\": \"Generate a friendly welcome message for \" + $json.name}]}] }}"
            }
          ]
        }
      },
      "name": "Generate Welcome Message",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [850, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://localhost:3000/api/messages/send",
        "authentication": "genericCredentialType",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "contact_id",
              "value": "={{ $json.contact_id }}"
            },
            {
              "name": "message",
              "value": "={{ $json.generated_message }}"
            }
          ]
        }
      },
      "name": "Send WhatsApp Message",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1050, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Wait 1 Hour", "type": "main", "index": 0}]]
    },
    "Wait 1 Hour": {
      "main": [[{"node": "Get Contact", "type": "main", "index": 0}]]
    },
    "Get Contact": {
      "main": [[{"node": "Generate Welcome Message", "type": "main", "index": 0}]]
    },
    "Generate Welcome Message": {
      "main": [[{"node": "Send WhatsApp Message", "type": "main", "index": 0}]]
    }
  }
}
```

### Workflow 2: Abandoned Cart Recovery

**Purpose**: Re-engage customers who showed interest but didn't purchase

```
Webhook Trigger (Product Interest Detected)
    ↓
MongoDB: Store Interest Event
    ↓
Wait 2 Hours
    ↓
MongoDB: Check if Purchase Made
    ↓
IF No Purchase:
    ↓
    Gemini AI: Generate Reminder with 5% Discount
    ↓
    Send WhatsApp Message
    ↓
    Wait 24 Hours
    ↓
    Check Purchase Again
    ↓
    IF Still No Purchase:
        ↓
        Gemini AI: Generate Urgency Message with 10% Discount
        ↓
        Send WhatsApp Message
```

### Workflow 3: Customer Feedback Collection

**Purpose**: Automatically collect feedback after purchase

```
Webhook Trigger (Purchase Event)
    ↓
MongoDB: Update Customer Journey to "Purchase"
    ↓
Wait 7 Days
    ↓
Gemini AI: Generate Personalized Feedback Request
    ↓
Send WhatsApp Message
    ↓
Wait for Response (3 Days)
    ↓
IF Response Received:
    ↓
    Gemini AI: Analyze Sentiment
    ↓
    MongoDB: Store Feedback
    ↓
    IF Negative → Alert Agent
    ↓
    IF Positive → Send Thank You
```

### Workflow 4: Smart Re-engagement

**Purpose**: Re-engage inactive customers

```
Cron Trigger (Daily at 10 AM)
    ↓
MongoDB: Find Inactive Customers (>7 days)
    ↓
For Each Customer:
    ↓
    MongoDB: Get Customer History
    ↓
    Gemini AI: Generate Personalized Re-engagement
    ↓
    Send WhatsApp Message
    ↓
    MongoDB: Update Last Contact Date
```

### Workflow 5: AI-Powered Lead Scoring

**Purpose**: Automatically score and qualify leads

```
Webhook Trigger (New Message)
    ↓
MongoDB: Get Conversation History
    ↓
Gemini AI: Analyze Buying Intent
    ↓
Calculate Lead Score:
    - Message frequency
    - Sentiment
    - Keywords
    - Engagement level
    ↓
MongoDB: Update Lead Score
    ↓
IF Score > 80:
    ↓
    Assign to Sales Agent
    ↓
    Send Notification
```

## Creating Your First Workflow

### Step-by-Step: Lead Nurturing Workflow

#### 1. Create New Workflow
- Click **Workflows** → **Add Workflow**
- Name it: "Lead Nurturing Sequence"

#### 2. Add Webhook Trigger
- Click **+** → Search "Webhook"
- Select **Webhook** node
- HTTP Method: **POST**
- Path: `lead-nurturing`
- Click **Execute Node** to get webhook URL

#### 3. Add Wait Node
- Click **+** → Search "Wait"
- Amount: **1**
- Unit: **hours**

#### 4. Add MongoDB Node
- Click **+** → Search "MongoDB"
- Operation: **Find One**
- Collection: `contacts`
- Query: `{ "_id": "{{ $json.contact_id }}" }`
- Select your MongoDB credential

#### 5. Add HTTP Request (Gemini AI)
- Click **+** → Search "HTTP Request"
- Method: **POST**
- URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={{ $env.GEMINI_API_KEY }}`
- Body:
```json
{
  "contents": [{
    "parts": [{
      "text": "Generate a friendly welcome message for {{ $json.name }}. Keep it under 160 characters."
    }]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 100
  }
}
```

#### 6. Add Code Node (Extract AI Response)
- Click **+** → Search "Code"
- Code:
```javascript
const response = $input.item.json;
const generatedText = response.candidates[0].content.parts[0].text;

return {
  json: {
    contact_id: $('Get Contact').item.json._id,
    message: generatedText,
    contact_name: $('Get Contact').item.json.name,
    phone_number: $('Get Contact').item.json.phone_number
  }
};
```

#### 7. Add HTTP Request (Send Message)
- Click **+** → Search "HTTP Request"
- Method: **POST**
- URL: `http://localhost:3000/api/messages/send`
- Body:
```json
{
  "phone_number": "{{ $json.phone_number }}",
  "message": "{{ $json.message }}"
}
```

#### 8. Connect All Nodes
- Drag connections between nodes
- Webhook → Wait → MongoDB → Gemini → Code → Send Message

#### 9. Save and Activate
- Click **Save**
- Toggle **Active** switch

#### 10. Test Your Workflow
```bash
curl -X POST http://localhost:5678/webhook/lead-nurturing \
  -H "Content-Type: application/json" \
  -d '{"contact_id": "your_contact_id"}'
```

## Advanced n8n Features for AI CRM

### 1. Environment Variables

Add to n8n:
```bash
# In docker-compose.yml
environment:
  - GEMINI_API_KEY=your_gemini_api_key
  - MONGODB_URI=your_mongodb_uri
  - WHATSAPP_API_TOKEN=your_whatsapp_token
```

### 2. Error Handling

Add **Error Trigger** node:
- Catches workflow errors
- Sends alert to admin
- Logs to MongoDB

### 3. Conditional Logic

Use **IF** node:
```javascript
// Check if customer is engaged
{{ $json.message_count > 5 && $json.last_message_days < 7 }}
```

### 4. Loops and Iterations

Use **Split In Batches** node:
- Process multiple contacts
- Avoid rate limits
- Batch operations

### 5. Scheduling

Use **Cron** node:
- Daily reports: `0 9 * * *`
- Weekly cleanup: `0 0 * * 0`
- Hourly checks: `0 * * * *`

## Integrating n8n with Your CRM

### Create Webhook Endpoints in Your Server

Add to `server/routes/n8n.js`:
```javascript
import express from 'express';
import { getDB } from '../db/mongodb.js';

const router = express.Router();

// Trigger n8n workflow
router.post('/trigger/:workflow', async (req, res) => {
  try {
    const { workflow } = req.params;
    const data = req.body;

    // Call n8n webhook
    const response = await fetch(
      `${process.env.N8N_WEBHOOK_URL}/${workflow}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }
    );

    res.json({ success: true, workflow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Trigger Workflows from Your Code

```javascript
// When new contact is created
async function onContactCreated(contact) {
  await fetch('http://localhost:3000/api/n8n/trigger/lead-nurturing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact_id: contact._id,
      name: contact.name,
      phone_number: contact.phone_number
    })
  });
}

// When product interest is detected
async function onProductInterest(contact, product) {
  await fetch('http://localhost:3000/api/n8n/trigger/abandoned-cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact_id: contact._id,
      product_id: product.id,
      product_name: product.name,
      timestamp: new Date()
    })
  });
}
```

## Monitoring and Debugging

### 1. Execution Log
- Click **Executions** in n8n
- View all workflow runs
- See input/output data
- Debug errors

### 2. Test Workflows
- Click **Execute Workflow** button
- Manually trigger with test data
- Check each node's output

### 3. Webhook Testing
```bash
# Test webhook with curl
curl -X POST http://localhost:5678/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Best Practices

### 1. Use Descriptive Names
- Workflow: "Lead Nurturing - Welcome Sequence"
- Nodes: "Get Contact from MongoDB", "Generate AI Message"

### 2. Add Notes
- Right-click node → Add Note
- Document complex logic
- Explain business rules

### 3. Version Control
- Export workflows as JSON
- Store in Git repository
- Track changes

### 4. Error Handling
- Always add error triggers
- Log failures to MongoDB
- Send admin notifications

### 5. Rate Limiting
- Add delays between API calls
- Use batch processing
- Respect API limits

## Troubleshooting

### n8n Won't Start
```bash
# Check if port 5678 is in use
lsof -i :5678

# Kill process if needed
kill -9 <PID>

# Restart n8n
docker-compose restart n8n
```

### Webhook Not Receiving Data
- Check firewall settings
- Verify webhook URL is correct
- Test with curl first
- Check n8n logs: `docker logs n8n`

### MongoDB Connection Failed
- Verify connection string
- Check IP whitelist in MongoDB Atlas
- Test connection outside n8n

### Gemini API Errors
- Check API key is correct
- Verify rate limits not exceeded
- Check request format

## Cost Breakdown

| Component | Cost |
|-----------|------|
| n8n (Self-hosted) | **FREE** |
| MongoDB Atlas | **FREE** (512MB) |
| Gemini API | **FREE** (1M tokens/day) |
| Server (Self-hosted) | **FREE** |
| **TOTAL** | **$0/month** |

## Next Steps

1. ✅ Install n8n with Docker
2. ✅ Create MongoDB credential
3. ✅ Import pre-built workflows
4. ✅ Test with sample data
5. ✅ Connect to your WhatsApp CRM
6. ✅ Monitor and optimize

---

**You now have a powerful visual automation platform integrated with your FREE agentic AI WhatsApp CRM!** 🚀

**Total Stack Cost: $0/month** 💰