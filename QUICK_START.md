# ⚡ Quick Start - 2 Commands

Your environment is fully configured! Just run these two commands:

## Terminal 1: Start N8N
```bash
npx n8n
```
Wait for: `Editor is now accessible via: http://localhost:5678`

## Terminal 2: Start Next.js
```bash
npm run dev
```
Wait for: `✓ Ready in 2s` and `Local: http://localhost:3000`

---

## Open in Browser

- **Your CRM:** http://localhost:3000
- **N8N Workflows:** http://localhost:5678

---

## ✅ Your Configuration Status

- ✅ Supabase: Connected
- ✅ Gemini AI: Configured
- ✅ N8N: Ready
- ✅ Twilio WhatsApp: Configured with sandbox

---

## Test WhatsApp

Since you have Twilio configured:

1. **Join the sandbox** (if you haven't):
   - Open WhatsApp on your phone
   - Send `join <code>` to `+1 415 523 8886`
   - (Get the exact code from Twilio console)

2. **Test sending from CRM:**
   - Go to http://localhost:3000
   - Navigate to a conversation
   - Type a message and click Send
   - Check your WhatsApp - it should arrive!

3. **Test receiving (optional - needs webhook):**
   - See `LOCAL_DEVELOPMENT_GUIDE.md` for ngrok setup

---

## That's It!

You're running a full WhatsApp CRM with AI! 🎉

**Need more details?** Check `START_DEVELOPMENT.md` or `LOCAL_DEVELOPMENT_GUIDE.md`
