# Complete Setup Guide - FREE Agentic AI WhatsApp CRM

## 🎉 What You're Building

A **100% FREE** autonomous AI-powered WhatsApp CRM that:
- Automatically responds to customers with Gemini AI
- Tracks customer journey and scores leads
- Runs complex automation workflows with n8n
- Stores everything in MongoDB
- Costs **$0/month** to run

## 📋 Prerequisites

- Computer with 4GB RAM minimum
- Internet connection
- Basic command line knowledge
- 30 minutes of setup time

## 🚀 Quick Start (5 Steps)

### Step 1: Get FREE MongoDB Atlas (5 minutes)

1. **Sign up**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. **Create cluster**: Choose **M0 FREE** tier (512MB)
3. **Create user**: Username: `whatsapp-admin`, strong password
4. **Network access**: Allow access from anywhere (0.0.0.0/0)
5. **Get connection string**: 
   ```
   mongodb+srv://whatsapp-admin:PASSWORD@cluster.mongodb.net/whatsapp-crm
   ```

📖 **Detailed guide**: See `MONGODB_SETUP_GUIDE.md`

---

### Step 2: Get FREE Gemini API Key (2 minutes)

1. **Visit**: [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Sign in**: Use your Google account
3. **Create API Key**: Click "Create API Key"
4. **Copy key**: Starts with `AIzaSy...`

📖 **Detailed guide**: See `GEMINI_SETUP_GUIDE.md`

---

### Step 3: Set Up Backend Server (5 minutes)

```bash
# Clone or navigate to your project
cd whatsapp-crm

# Install server dependencies
cd server
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Add your credentials to `.env`:
```env
MONGODB_URI=mongodb+srv://whatsapp-admin:YOUR_PASSWORD@cluster.mongodb.net/whatsapp-crm
GEMINI_API_KEY=AIzaSy...your_key_here
PORT=3000
JWT_SECRET=your_random_secret_key
```

Start the server:
```bash
npm run dev
```

You should see:
```
✅ Connected to MongoDB
🚀 Server running on port 3000
```

---

### Step 4: Set Up n8n Workflows (10 minutes)

```bash
# Make start script executable
chmod +x start-n8n.sh

# Start n8n
./start-n8n.sh
```

Or manually with Docker:
```bash
docker-compose -f n8n-docker-compose.yml up -d
```

**Access n8n**: Open `http://localhost:5678`
- Username: `admin`
- Password: `change_this_password`

**Import workflows**:
1. Click **Workflows** → **Import from File**
2. Import all files from `n8n-workflows/` directory
3. Configure MongoDB credentials in n8n
4. Activate workflows

📖 **Detailed guide**: See `N8N_SETUP_GUIDE.md`

---

### Step 5: Connect WhatsApp Business API (10 minutes)

1. **Get WhatsApp Business API access**:
   - Go to [Meta for Developers](https://developers.facebook.com/)
   - Create app → Business → WhatsApp
   - Get Phone Number ID and Access Token

2. **Configure webhook**:
   - Webhook URL: `http://your-server.com/webhook/whatsapp`
   - Verify Token: Set in your `.env` file
   - Subscribe to `messages` events

3. **Test webhook**:
```bash
curl -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "1234567890",
            "type": "text",
            "text": {"body": "Hello"}
          }]
        }
      }]
    }]
  }'
```

---

## 🎯 Verify Everything Works

### Test 1: MongoDB Connection
```bash
cd server
node -e "
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);
client.connect().then(() => {
  console.log('✅ MongoDB connected!');
  client.close();
}).catch(err => console.error('❌ Error:', err));
"
```

### Test 2: Gemini API
```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=YOUR_GEMINI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Say hello"}]}]}'
```

### Test 3: Server API
```bash
# Create a test contact
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1234567890",
    "name": "Test User",
    "tags": ["test"]
  }'
```

### Test 4: n8n Workflow
```bash
# Trigger lead nurturing workflow
curl -X POST http://localhost:5678/webhook/lead-nurturing \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "your_contact_id",
    "name": "Test User"
  }'
```

---

## 📊 Architecture Overview

```
WhatsApp Message
    ↓
Your Server (Node.js + Express)
    ↓
Gemini AI (Analyze message)
    ↓
MongoDB (Store data)
    ↓
n8n (Trigger workflows)
    ↓
Gemini AI (Generate response)
    ↓
WhatsApp API (Send message)
```

---

## 💰 Cost Breakdown

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| MongoDB Atlas | M0 FREE (512MB) | **$0** |
| Gemini API | FREE (1M tokens/day) | **$0** |
| n8n | Self-hosted | **$0** |
| Node.js Server | Self-hosted | **$0** |
| **TOTAL** | | **$0/month** |

---

## 🔧 Configuration Files

### `.env` (Server)
```env
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=AIzaSy...
PORT=3000
NODE_ENV=development
JWT_SECRET=random_secret_key
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_ACCESS_TOKEN=your_access_token
```

### `n8n-docker-compose.yml` (n8n)
```yaml
environment:
  - GEMINI_API_KEY=${GEMINI_API_KEY}
  - MONGODB_URI=${MONGODB_URI}
  - N8N_BASIC_AUTH_USER=admin
  - N8N_BASIC_AUTH_PASSWORD=your_password
```

---

## 📁 Project Structure

```
whatsapp-crm/
├── server/                      # Backend server
│   ├── index.js                # Express server
│   ├── db/mongodb.js           # MongoDB connection
│   ├── routes/                 # API routes
│   │   ├── contacts.js
│   │   ├── webhook.js
│   │   └── ...
│   ├── services/               # Business logic
│   │   ├── gemini.js          # Gemini AI service
│   │   └── triggers.js        # Trigger engine
│   └── package.json
├── n8n-workflows/              # n8n workflow templates
│   ├── 1-lead-nurturing.json
│   ├── 2-abandoned-cart.json
│   └── README.md
├── n8n-docker-compose.yml      # n8n Docker setup
├── start-n8n.sh               # n8n quick start script
├── .env.example               # Environment template
├── MONGODB_SETUP_GUIDE.md     # MongoDB guide
├── GEMINI_SETUP_GUIDE.md      # Gemini guide
├── N8N_SETUP_GUIDE.md         # n8n guide
└── COMPLETE_SETUP_GUIDE.md    # This file
```

---

## 🎓 Learning Path

### Day 1: Setup
- ✅ Set up MongoDB Atlas
- ✅ Get Gemini API key
- ✅ Start backend server
- ✅ Test basic functionality

### Day 2: n8n Workflows
- ✅ Install n8n
- ✅ Import workflows
- ✅ Test lead nurturing
- ✅ Customize messages

### Day 3: WhatsApp Integration
- ✅ Set up WhatsApp Business API
- ✅ Configure webhook
- ✅ Test end-to-end flow
- ✅ Monitor conversations

### Day 4: Customization
- ✅ Create custom workflows
- ✅ Adjust AI prompts
- ✅ Add business logic
- ✅ Optimize performance

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>

# Check MongoDB connection
echo $MONGODB_URI
```

### n8n won't start
```bash
# Check Docker
docker ps

# View logs
docker logs n8n-whatsapp-crm

# Restart
docker-compose -f n8n-docker-compose.yml restart
```

### Gemini API errors
- Verify API key is correct
- Check rate limits (15 req/min)
- Test with curl first

### MongoDB connection failed
- Check connection string format
- Verify IP whitelist in Atlas
- Test with MongoDB Compass

---

## 📚 Documentation

- **MongoDB Setup**: `MONGODB_SETUP_GUIDE.md`
- **Gemini API**: `GEMINI_SETUP_GUIDE.md`
- **n8n Workflows**: `N8N_SETUP_GUIDE.md`
- **Architecture**: `MONGODB_ARCHITECTURE.md`
- **Workflows**: `n8n-workflows/README.md`

---

## 🚀 Going to Production

### 1. Security
- Change default passwords
- Use environment variables
- Enable HTTPS
- Restrict IP access

### 2. Hosting
- Deploy server to:
  - Heroku (FREE tier)
  - Railway (FREE tier)
  - DigitalOcean ($5/month)
  - AWS EC2 (FREE tier 1 year)

### 3. Domain
- Get free domain from Freenom
- Or use Cloudflare for DNS

### 4. Monitoring
- Set up error logging
- Monitor API usage
- Track workflow executions
- Set up alerts

---

## 🎉 You're Done!

You now have a **fully functional, autonomous AI-powered WhatsApp CRM** that:
- ✅ Costs **$0/month** to run
- ✅ Handles unlimited conversations
- ✅ Automatically nurtures leads
- ✅ Scores and qualifies prospects
- ✅ Runs complex automation workflows
- ✅ Scales with your business

### Next Steps:
1. Test with real WhatsApp messages
2. Customize AI prompts for your business
3. Create custom n8n workflows
4. Monitor and optimize performance
5. Scale to production!

---

## 💬 Support

- **MongoDB**: https://www.mongodb.com/docs
- **Gemini API**: https://ai.google.dev/docs
- **n8n**: https://docs.n8n.io
- **Node.js**: https://nodejs.org/docs

---

**Happy Building! 🚀**

**Total Setup Time**: ~30 minutes
**Total Monthly Cost**: $0
**Value**: Priceless 💎