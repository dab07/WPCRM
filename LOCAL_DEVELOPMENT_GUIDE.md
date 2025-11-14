# Local Development Setup Guide

## Prerequisites Checklist

Before starting, make sure you have:

- [x] Supabase project created and credentials in `.env`
- [x] Gemini API key in `.env`
- [x] N8N configured with API key in `.env`
- [ ] Twilio credentials in `.env` (add these now if you have them)
- [x] Node.js installed
- [x] Dependencies installed (`npm install`)

---

## Step-by-Step Startup Process

### Step 1: Start N8N (Terminal 1)

Open your first terminal and run:

```bash
npx n8n
```

**What to expect:**
- N8N will start on `http://localhost:5678`
- First time: It will download and install N8N
- You'll see: "Editor is now accessible via: http://localhost:5678"
- **Keep this terminal running!**

**Verify N8N is running:**
- Open browser: http://localhost:5678
- You should see the N8N interface
- Login with your credentials (if you set them up)

---

### Step 2: Start Next.js Dev Server (Terminal 2)

Open a **second terminal** (keep N8N running in the first) and run:

```bash
npm run dev
```

**What to expect:**
- Next.js will start on `http://localhost:3000`
- You'll see: "Ready in X ms"
- You'll see: "Local: http://localhost:3000"
- **Keep this terminal running too!**

**Verify Next.js is running:**
- Open browser: http://localhost:3000
- You should see your WhatsApp CRM dashboard

---

## Quick Verification Checklist

### ✅ N8N Running
- [ ] Terminal 1 shows N8N is running
- [ ] Can access http://localhost:5678
- [ ] N8N dashboard loads

### ✅ Next.js Running
- [ ] Terminal 2 shows Next.js is ready
- [ ] Can access http://localhost:3000
- [ ] CRM dashboard loads

### ✅ Environment Variables
- [ ] Supabase URL and key set
- [ ] Gemini API key set
- [ ] N8N API key set
- [ ] Twilio credentials set (if testing WhatsApp)

---

## Testing Your Application

### Test 1: Check Dashboard Loads
1. Go to http://localhost:3000
2. You should see the CRM dashboard with tabs:
   - Conversations
   - Contacts
   - Campaigns
   - Follow-up Rules
   - Triggers
   - N8N Integration
   - Agentic Dashboard

### Test 2: Check Supabase Connection
1. Click on "Contacts" tab
2. If you see a list (even if empty), Supabase is connected ✅
3. If you see errors, check your Supabase credentials in `.env`

### Test 3: Check N8N Connection
1. Click on "N8N Integration" tab
2. You should see workflow options
3. If you see connection errors, verify:
   - N8N is running on port 5678
   - `N8N_BASE_URL=http://localhost:5678` in `.env`
   - N8N API key is correct

### Test 4: Test WhatsApp (if Twilio is configured)
1. Make sure you've:
   - Signed up for Twilio
   - Joined the WhatsApp sandbox
   - Added credentials to `.env`
   - Restarted `npm run dev` after adding credentials

2. Send a test message:
   - Go to a conversation in your CRM
   - Type a message and click Send
   - Check your WhatsApp - message should arrive!

---

## Common Issues & Solutions

### Issue: "Port 3000 is already in use"
**Solution:**
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

### Issue: "Port 5678 is already in use"
**Solution:**
```bash
# Kill the process using port 5678
lsof -ti:5678 | xargs kill -9

# Then restart N8N
npx n8n
```

### Issue: "Cannot connect to Supabase"
**Solution:**
1. Check `.env` file has correct credentials
2. Verify Supabase project is active
3. Check internet connection
4. Restart `npm run dev`

### Issue: "N8N API key invalid"
**Solution:**
1. Go to N8N: http://localhost:5678
2. Settings → API → Generate new key
3. Update `NEXT_PUBLIC_N8N_API_KEY` in `.env`
4. Restart `npm run dev`

### Issue: "Twilio messages not sending"
**Solution:**
1. Verify you joined the WhatsApp sandbox
2. Check credentials in `.env` are correct (no extra spaces)
3. Restart `npm run dev` after changing `.env`
4. Check Twilio console for error logs

---

## Development Workflow

### Normal Daily Startup

**Terminal 1:**
```bash
npx n8n
```

**Terminal 2:**
```bash
npm run dev
```

**Browser:**
- N8N: http://localhost:5678
- CRM: http://localhost:3000

### Making Code Changes

- Next.js has **hot reload** - changes appear automatically
- No need to restart the server for most changes
- If you change `.env`, you **must restart** `npm run dev`

### Stopping the Servers

**To stop gracefully:**
- Press `Ctrl + C` in each terminal

**To force stop:**
```bash
# Kill Next.js
lsof -ti:3000 | xargs kill -9

# Kill N8N
lsof -ti:5678 | xargs kill -9
```

---

## Optional: Use a Process Manager

If you want to run both servers with one command, create a script:

### Option 1: Using npm-run-all

```bash
# Install
npm install --save-dev npm-run-all

# Add to package.json scripts:
"dev:all": "npm-run-all --parallel dev:n8n dev:next",
"dev:n8n": "npx n8n",
"dev:next": "next dev"

# Run both:
npm run dev:all
```

### Option 2: Simple Shell Script

Create `start-dev.sh`:
```bash
#!/bin/bash

# Start N8N in background
npx n8n &

# Wait for N8N to start
sleep 5

# Start Next.js
npm run dev
```

Make it executable:
```bash
chmod +x start-dev.sh
./start-dev.sh
```

---

## Next Steps After Startup

1. **Test Basic Functionality**
   - Navigate through all tabs
   - Check for console errors
   - Verify data loads from Supabase

2. **Add Test Data** (if needed)
   - Create a test contact
   - Start a test conversation
   - Try sending a message

3. **Configure Twilio** (if not done)
   - Follow `TWILIO_SETUP_CHECKLIST.md`
   - Add credentials to `.env`
   - Restart `npm run dev`
   - Test WhatsApp messaging

4. **Set Up Webhooks** (for production)
   - Use ngrok for local testing
   - Configure Twilio webhook
   - Test incoming messages

---

## Quick Reference

| Service | URL | Terminal Command |
|---------|-----|------------------|
| N8N | http://localhost:5678 | `npx n8n` |
| Next.js | http://localhost:3000 | `npm run dev` |
| Supabase | Dashboard URL | (Cloud service) |
| Twilio | twilio.com/console | (Cloud service) |

---

## Ready to Start?

### Quick Start Commands:

**Terminal 1:**
```bash
npx n8n
```

**Terminal 2:**
```bash
npm run dev
```

**Browser:**
```
http://localhost:3000
```

That's it! Your WhatsApp CRM is now running locally! 🚀
