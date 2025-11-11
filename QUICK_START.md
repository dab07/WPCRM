# Quick Start Guide - Agentic AI WhatsApp CRM

## Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (FREE)
- Google Gemini API key (FREE)

## Step 1: MongoDB Setup (5 minutes)

1. Create FREE MongoDB Atlas account: https://www.mongodb.com/cloud/atlas/register
2. Create a cluster (M0 FREE tier)
3. Add database user (Database Access)
4. Allow network access (Network Access → Allow from Anywhere)
5. Get connection string (Connect → Connect your application)

## Step 2: Environment Configuration

Create `.env` file in project root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=whatsapp_crm

# AI
GEMINI_API_KEY=your_gemini_api_key

# Server
PORT=3000
NODE_ENV=development

# Frontend
VITE_API_BASE_URL=http://localhost:3000/api
```

## Step 3: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

## Step 4: Test MongoDB Connection

```bash
npm run test:db
```

Expected output:
```
✅ Successfully connected to MongoDB!
✨ All tests passed!
```

## Step 5: Start the Application

### Terminal 1 - Backend Server
```bash
npm run server
```

Expected output:
```
✅ Connected to MongoDB
🚀 Server running on port 3000
🔗 API: http://localhost:3000/api
```

### Terminal 2 - Frontend
```bash
npm run dev
```

Expected output:
```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

## Step 6: Access the Application

Open your browser and go to: **http://localhost:5173**

You should see the Agentic AI Dashboard with tabs:
- 🧠 Agentic AI - Metrics and automation overview
- 💬 Conversations - Chat interface
- 👥 Contacts - Contact management
- 📢 Campaigns - Bulk messaging
- ⚡ Triggers - Event automation
- 🔄 Workflows - n8n integration
- ⏰ Follow-ups - Automated follow-ups

## Features Available

### ✅ No Authentication Required
- Direct access to all features
- No login/signup needed
- Perfect for single-user or team use

### ✅ Contact Management
- Add contacts manually
- Tag and categorize
- Search and filter
- View contact details

### ✅ Conversations
- View all WhatsApp conversations
- Real-time message updates (polling)
- Send messages
- Assign conversations

### ✅ Campaigns
- Create bulk messaging campaigns
- Target by tags
- Schedule campaigns
- Track delivery

### ✅ Triggers
- Create event-based automation
- Keyword detection
- Conversation idle detection
- High intent detection
- Execute n8n workflows

### ✅ Agentic AI Dashboard
- Real-time metrics
- AI handling percentage
- Trigger execution stats
- Workflow performance
- Agent status monitoring

## Troubleshooting

### MongoDB Connection Failed
```bash
# Check your .env file
cat .env

# Test connection
npm run test:db
```

### Server Won't Start
```bash
# Check if port 3000 is available
lsof -i :3000

# Kill process if needed
kill -9 <PID>
```

### Frontend Can't Connect to Backend
1. Verify backend is running on port 3000
2. Check `VITE_API_BASE_URL` in .env
3. Check browser console for errors

## Next Steps

### 1. Configure WhatsApp Integration
- Set up WhatsApp Business API
- Configure webhook URL
- Add verification token

### 2. Set Up n8n Workflows
```bash
# Start n8n
./start-n8n.sh
```

### 3. Configure Gemini AI
- Get API key from https://makersuite.google.com/app/apikey
- Add to .env file
- Test AI responses

### 4. Add Sample Data
- Create test contacts
- Send test messages
- Create sample campaigns
- Set up triggers

## Production Deployment

### Backend
- Deploy to Railway, Render, or Heroku
- Set environment variables
- Update CORS settings
- Enable MongoDB Atlas IP whitelist

### Frontend
- Build: `npm run build`
- Deploy to Vercel, Netlify, or Cloudflare Pages
- Update `VITE_API_BASE_URL` to production API

## Support

- 📖 Full documentation: See MONGODB_SETUP.md
- 🔧 Architecture: See MONGODB_ARCHITECTURE.md
- 🚀 Migration guide: See MIGRATION_TO_MONGODB.md
- 📝 Updates: See SRC_FOLDER_UPDATE.md

## Development Commands

```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run linter
npm run typecheck    # Check TypeScript

# Backend
npm run server       # Start backend (dev mode)
npm run server:start # Start backend (production)

# Testing
npm run test:db      # Test MongoDB connection
```

## Project Structure

```
WhatsAppCRM/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── lib/               # API client
│   └── App.tsx            # Main app
├── server/                # Backend Express API
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── db/                # MongoDB connection
├── n8n-workflows/         # Automation workflows
└── .env                   # Environment variables
```

## Key Features

🤖 **AI-Powered** - Google Gemini integration
📊 **Analytics** - Real-time metrics dashboard
⚡ **Automation** - Trigger-based workflows
🔄 **n8n Integration** - Visual workflow builder
💬 **WhatsApp** - Direct messaging integration
🎯 **Campaigns** - Bulk messaging with targeting
📱 **Responsive** - Works on all devices
🚀 **Fast** - Optimized performance
💾 **MongoDB** - Flexible data storage
🆓 **FREE** - All services have free tiers

Enjoy your Agentic AI WhatsApp CRM! 🎉
