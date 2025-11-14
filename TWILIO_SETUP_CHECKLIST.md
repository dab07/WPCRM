# Twilio Setup Checklist

## Step 1: Create Twilio Account ⏱️ 2 minutes

1. Go to: **https://www.twilio.com/try-twilio**
2. Click "Sign up"
3. Fill in:
   - First Name
   - Last Name
   - Email
   - Password
4. Verify your email
5. Verify your phone number (they'll send a code)

✅ You'll get **$15 free trial credits**

---

## Step 2: Get Your Credentials ⏱️ 1 minute

1. After login, you'll see the **Twilio Console Dashboard**
2. Look for the "Account Info" section (usually on the right side)
3. Copy these two values:

   ```
   Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Auth Token: (click "Show" to reveal)
   ```

---

## Step 3: Join WhatsApp Sandbox ⏱️ 2 minutes

1. In Twilio Console, navigate to:
   - **Messaging** (left sidebar)
   - **Try it out**
   - **Send a WhatsApp message**

2. You'll see instructions like:
   ```
   Join your sandbox by sending "join <word>-<word>" 
   to +1 415 523 8886 on WhatsApp
   ```

3. Open WhatsApp on your phone
4. Send that message to the number shown
5. You'll get a confirmation: "You are all set!"

---

## Step 4: Update Your .env File ⏱️ 1 minute

Open your `.env` file and replace the placeholders:

```bash
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Paste your Account SID
TWILIO_AUTH_TOKEN=your_actual_auth_token_here          # Paste your Auth Token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886           # Use the sandbox number shown
```

**Save the file!**

---

## Step 5: Test It! ⏱️ 2 minutes

### Start your development server:

```bash
npm run dev
```

### Test sending from CRM:

1. Open your browser: http://localhost:3000
2. Go to a conversation (or create a test one)
3. Type a message and click Send
4. Check your WhatsApp - the message should arrive!

### Test receiving messages:

1. Send a WhatsApp message to the sandbox number
2. Check your CRM dashboard
3. The message should appear in conversations!

---

## ✅ Success Checklist

- [ ] Twilio account created
- [ ] Account SID copied
- [ ] Auth Token copied
- [ ] Joined WhatsApp sandbox from your phone
- [ ] Updated `.env` file with credentials
- [ ] Saved `.env` file
- [ ] Ran `npm run dev`
- [ ] Sent test message from CRM → received in WhatsApp
- [ ] Sent WhatsApp message → appeared in CRM

---

## 🎉 You're Done!

Your WhatsApp CRM is now live with Twilio sandbox!

### What's Next?

**For Testing (Current State):**
- You can send/receive messages
- Only you (sandbox member) can chat
- Perfect for development

**For Production (When Ready):**
1. Request a production WhatsApp number in Twilio
2. Fill out the business profile form
3. Wait 1-3 days for approval
4. Update `TWILIO_WHATSAPP_NUMBER` in `.env`
5. Deploy to Vercel
6. Configure webhook in Twilio

---

## 🆘 Troubleshooting

### "Can't find Account SID"
- It's on the main dashboard after login
- Look for "Account Info" panel on the right

### "Sandbox join not working"
- Make sure you're sending to the exact number shown
- Include "join" and the exact code words
- Try from a different WhatsApp account if needed

### "Messages not sending from CRM"
- Check `.env` file is saved
- Restart `npm run dev` after changing `.env`
- Verify credentials are correct (no extra spaces)
- Check Twilio console logs: Monitor → Logs → Errors

### "Messages not appearing in CRM"
- For now, this is expected without webhook setup
- Messages you send FROM CRM will work
- To receive messages IN CRM, you'll need ngrok (see TWILIO_QUICKSTART.md)

---

## 💡 Quick Tips

- **Sandbox is free** - use it as long as you want for testing
- **Trial credits** - $15 is enough for ~3,000 messages
- **Multiple users** - Each person needs to join the sandbox
- **Production** - Request when you're ready to go live

---

**Current Status**: Ready to add your Twilio credentials!

**Next Action**: Go to https://www.twilio.com/try-twilio and sign up!
