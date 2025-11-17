# Greetings & Follow-up Setup - Quick Reference

## ✅ What's Already Configured

### 1. **3-Day Follow-up** (Already Active)
- **Trigger:** After 72 hours (3 days) of no conversation
- **Condition:** Last message was from customer
- **Message:**
```
Hi {{name}}! 👋

Hope you're doing well! I wanted to check in and see if there's anything I can help you with.

Feel free to reach out anytime! 😊
```

### 2. **Customer Greetings** (Already Active)
When customer sends: "Hi", "Hello", "Hey", "Good morning", etc.

**AI responds:**
```
Hello! 👋 Welcome! 

Great to hear from you! How can I assist you today? 😊
```

### 3. **Welcome Message** (Already Active)
When you add a new contact:

**They receive:**
```
Hi [Name]! 👋

Welcome to our service! We're so excited to connect with you! 🎉

Feel free to message us anytime - we're here to help!

How can we assist you today? 😊
```

## 🚀 How It Works

### Scenario 1: Customer Sends First Message
```
Customer: "Hi"
    ↓
Your AI: "Hello! 👋 Welcome! Great to hear from you! How can I assist you today? 😊"
```

### Scenario 2: Customer Sends Business Card
```
Customer: "Lead: John Doe, ABC Corp, john@abc.com"
    ↓
Your AI: Extracts data → Saves to database
    ↓
Your AI: "Thank you! I've saved your business card information:
         📛 Name: John Doe
         🏢 Company: ABC Corp
         📧 Email: john@abc.com
         How can I assist you today?"
```

### Scenario 3: Customer Goes Inactive
```
Day 1: Customer sends message
Day 2: No response
Day 3: No response
Day 4 (72 hours later): 
    ↓
Your AI: "Hi John! 👋 Hope you're doing well! I wanted to check in and see if there's anything I can help you with. Feel free to reach out anytime! 😊"
```

## 📝 Setup Instructions

### Step 1: Run Database Seed (One-time)

In Supabase SQL Editor, run:

```sql
-- Insert follow-up rules
INSERT INTO follow_up_rules (name, trigger_condition, inactivity_hours, message_template, is_active) VALUES
('3-Day Follow-up', 'inactivity', 72, 'Hi {{name}}! 👋

Hope you''re doing well! I wanted to check in and see if there''s anything I can help you with.

Feel free to reach out anytime! 😊', true);

-- Insert greeting responses
INSERT INTO ai_intents (intent_name, keywords, response_template, confidence_threshold, is_active) VALUES
('greeting', ARRAY['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'], 'Hello! 👋 Welcome! 

Great to hear from you! How can I assist you today? 😊', 0.8, true);
```

### Step 2: Activate n8n Follow-up Scheduler

1. Open n8n at `http://localhost:5678`
2. Import `guides/n8n-workflows/1-follow-up-scheduler.json`
3. Click "Activate" toggle
4. It will run every hour automatically

### Step 3: Test It!

**Test Greeting:**
```bash
# Send "Hi" from WhatsApp to your business number
# You should get: "Hello! 👋 Welcome! Great to hear from you! How can I assist you today? 😊"
```

**Test Follow-up:**
```bash
# Manually trigger follow-up check
curl http://localhost:3000/api/cron/follow-ups
```

## 🎨 Customize Messages

### Change Follow-up Timing

```sql
-- Send after 1 day instead of 3
UPDATE follow_up_rules 
SET inactivity_hours = 24 
WHERE name = '3-Day Follow-up';

-- Send after 5 days
UPDATE follow_up_rules 
SET inactivity_hours = 120 
WHERE name = '3-Day Follow-up';
```

### Change Follow-up Message

```sql
UPDATE follow_up_rules 
SET message_template = 'Your custom message with {{name}} variable'
WHERE name = '3-Day Follow-up';
```

### Change Greeting Response

```sql
UPDATE ai_intents 
SET response_template = 'Your custom greeting here'
WHERE intent_name = 'greeting';
```

### Add More Greeting Keywords

```sql
UPDATE ai_intents 
SET keywords = ARRAY['hello', 'hi', 'hey', 'howdy', 'sup', 'yo']
WHERE intent_name = 'greeting';
```

## 📊 Monitor Follow-ups

### Check Active Rules
```sql
SELECT * FROM follow_up_rules WHERE is_active = true;
```

### See Recent Follow-ups Sent
```sql
SELECT 
  c.name,
  m.content,
  m.created_at
FROM messages m
JOIN conversations conv ON m.conversation_id = conv.id
JOIN contacts c ON conv.contact_id = c.id
WHERE m.sender_type = 'ai'
  AND m.metadata->>'follow_up_rule_id' IS NOT NULL
ORDER BY m.created_at DESC
LIMIT 10;
```

### Find Conversations Due for Follow-up
```sql
SELECT 
  c.name,
  c.phone_number,
  conv.last_message_at,
  EXTRACT(EPOCH FROM (NOW() - conv.last_message_at))/3600 as hours_inactive
FROM conversations conv
JOIN contacts c ON conv.contact_id = c.id
WHERE 
  conv.status = 'active'
  AND conv.last_message_from = 'customer'
  AND conv.last_message_at < NOW() - INTERVAL '72 hours'
ORDER BY conv.last_message_at ASC;
```

## 🔧 Troubleshooting

### Follow-ups Not Sending?

1. **Check n8n is running:**
```bash
# Should show n8n interface
open http://localhost:5678
```

2. **Check workflow is active:**
   - Look for green "Active" badge in n8n

3. **Manually trigger:**
```bash
curl http://localhost:3000/api/cron/follow-ups
```

4. **Check logs:**
```bash
# In your terminal running npm run dev
# Look for: [Follow-ups] messages
```

### Greetings Not Working?

1. **Check AI intents exist:**
```sql
SELECT * FROM ai_intents WHERE intent_name = 'greeting';
```

2. **Test webhook:**
```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "1234567890",
            "id": "test123",
            "type": "text",
            "text": {"body": "Hi"}
          }]
        }
      }]
    }]
  }'
```

3. **Check Gemini API key:**
```bash
echo $GEMINI_API_KEY
```

## 📚 More Information

- [Customize Messages Guide](guides/CUSTOMIZE_MESSAGES.md) - Detailed customization
- [Testing Guide](guides/TESTING_GUIDE.md) - Test all features
- [Quick Reference](guides/QUICK_REFERENCE.md) - Common commands

## 🎉 You're All Set!

Your system is configured to:
- ✅ Greet customers when they say "Hi"
- ✅ Send follow-ups after 3 days of inactivity
- ✅ Welcome new contacts automatically
- ✅ Extract and save business cards
- ✅ Respond intelligently to questions

Just make sure:
1. Database seed data is loaded
2. n8n follow-up scheduler is active
3. WhatsApp webhook is configured

**Test it by sending "Hi" to your WhatsApp business number!** 🚀
