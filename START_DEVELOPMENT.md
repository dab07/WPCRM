# 🚀 Start Development - Quick Guide

## Before You Start

Make sure your `.env` file has all credentials:
```bash
# Check your .env file has these:
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ GEMINI_API_KEY
✅ NEXT_PUBLIC_N8N_API_KEY
✅ N8N_BASE_URL
✅ WHATSAPP_PROVIDER=twilio
✅ TWILIO_ACCOUNT_SID (add if you have it)
✅ TWILIO_AUTH_TOKEN (add if you have it)
✅ TWILIO_WHATSAPP_NUMBER (add if you have it)
```

---

## Step 1: Start N8N

Open **Terminal 1** and run:

```bash
npx n8n
```

**Wait for:**
```
Editor is now accessible via:
http://localhost:5678
```

✅ **Verify:** Open http://localhost:5678 in browser

---

## Step 2: Start Next.js

Open **Terminal 2** (keep Terminal 1 running!) and run:

```bash
npm run dev
```

**Wait for:**
```
✓ Ready in 2s
○ Local:        http://localhost:3000
```

✅ **Verify:** Open http://localhost:3000 in browser

---

## Step 3: Test Your Application

### Quick Tests:

1. **Dashboard loads?**
   - Go to http://localhost:3000
   - Should see CRM dashboard with tabs

2. **Supabase connected?**
   - Click "Contacts" tab
   - Should load (even if empty)

3. **N8N connected?**
   - Click "N8N Integration" tab
   - Should show workflow options

4. **WhatsApp ready?** (if Twilio configured)
   - Go to a conversation
   - Try sending a test message

---

## You're Running! 🎉

**Two terminals should be running:**
- Terminal 1: N8N on port 5678
- Terminal 2: Next.js on port 3000

**Two browser tabs:**
- http://localhost:5678 - N8N workflows
- http://localhost:3000 - Your CRM

---

## To Stop

Press `Ctrl + C` in each terminal

---

## Need Help?

- **Detailed guide:** See `LOCAL_DEVELOPMENT_GUIDE.md`
- **Twilio setup:** See `TWILIO_SETUP_CHECKLIST.md`
- **Port conflicts:** See troubleshooting in `LOCAL_DEVELOPMENT_GUIDE.md`

---

## What's Next?

If you haven't configured Twilio yet:
1. Go to https://www.twilio.com/try-twilio
2. Follow `TWILIO_SETUP_CHECKLIST.md`
3. Add credentials to `.env`
4. Restart `npm run dev` (Ctrl+C, then `npm run dev` again)
5. Test WhatsApp messaging!
