# Agentic AI WhatsApp CRM Setup Guide

## Overview
You now have a fully functional **Agentic AI-powered WhatsApp CRM system** with advanced autonomous capabilities:

### Core Features
- **Agentic AI Agents**: Autonomous AI agents for conversation, trigger detection, content generation, campaign management, and analytics
- **Intelligent Trigger System**: Automatic detection of customer behavior patterns and business opportunities
- **Dynamic Content Generation**: AI-powered personalized message creation
- **n8n Workflow Integration**: Visual workflow automation for complex business processes
- **Advanced Analytics**: Customer journey tracking, lead scoring, and predictive insights
- **Real-time Chat Interface**: Enhanced with AI conversation memory and context
- **Automated Campaign Orchestration**: AI-driven campaign planning and execution
- **Business Card OCR Processing**: Automatic contact extraction and CRM integration

### Legacy Features (Enhanced)
- AI auto-reply with advanced intent detection
- Automated follow-ups with intelligent timing
- Contact management with AI-powered segmentation
- Agent assignment with smart handover logic

## Database Setup
✅ Your database includes both legacy and new agentic AI tables:

### Legacy Tables (Enhanced)
- `agents` - System users who manage conversations
- `contacts` - Customer contact information with enhanced tagging
- `conversations` - Chat conversations with AI confidence tracking
- `messages` - Individual messages with AI attribution
- `follow_up_rules` - Automated follow-up rules
- `follow_up_queue` - Scheduled follow-ups
- `campaigns` - Marketing campaigns with AI optimization
- `campaign_messages` - Campaign tracking with performance metrics
- `ai_intents` - AI intent definitions (enhanced with confidence scoring)
- `business_card_uploads` - Business card processing with AI extraction

### New Agentic AI Tables
- `ai_agents` - Different AI agents for specific tasks (conversation, trigger, content, campaign, analytics)
- `triggers` - Automated trigger definitions and execution tracking
- `ai_conversations` - AI agent interaction history and context
- `customer_journey` - Customer lifecycle tracking and scoring
- `content_templates` - AI-generated content templates with performance metrics
- `workflow_executions` - n8n workflow execution tracking
- `conversation_analytics` - Conversation insights and sentiment analysis
- `campaign_performance` - Enhanced campaign metrics and optimization data
- `lead_scoring` - AI-powered lead qualification and scoring
- `message_variations` - A/B testing for message optimization
- `automation_rules` - Advanced automation rules with complex conditions

## Getting Started

### 1. Create Your First Admin Account
You need to create an admin account in Supabase:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to Authentication > Users
4. Click "Add user" and create a user with email/password
5. Copy the user's UUID
6. Go to SQL Editor and run:
```sql
INSERT INTO agents (id, email, full_name, role, is_active)
VALUES (
  'PASTE_USER_UUID_HERE',
  'your@email.com',
  'Your Name',
  'admin',
  true
);
```

### 2. WhatsApp Integration Setup

#### Webhook Configuration
Your WhatsApp webhook endpoint is deployed at:
```
https://iclfujxgvdjqyjsmwumd.supabase.co/functions/v1/whatsapp-webhook
```

To connect WhatsApp Business API:
1. Go to Meta Developer Portal
2. Configure your webhook URL (above)
3. Set verify token: `YOUR_VERIFY_TOKEN` (update in the edge function if needed)
4. Subscribe to message events

### 3. Agentic AI Configuration

#### Environment Variables
Add these new environment variables to your `.env` file:

```env
# AI Configuration (FREE Gemini API)
GEMINI_API_KEY=your_gemini_api_key

# Optional: Fallback AI providers
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# n8n Integration
N8N_BASE_URL=https://your-n8n-instance.com
N8N_API_KEY=your_n8n_api_key
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/whatsapp-crm
```

#### Getting Your FREE Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key and add it to your `.env` file
5. **No credit card required** - Gemini API is completely free!

#### Deploy Enhanced Edge Functions
Your new agentic AI system includes enhanced edge functions:

1. **Enhanced WhatsApp Webhook**: `agentic-whatsapp-webhook`
   - Advanced AI analysis of incoming messages
   - Automatic trigger detection and execution
   - Dynamic content generation
   - Customer journey tracking

2. **n8n Workflow Processor**: `n8n-workflow-processor`
   - Execute complex automation workflows
   - Lead nurturing sequences
   - Customer lifecycle management
   - External system integrations

Deploy these functions to Supabase:
```bash
supabase functions deploy agentic-whatsapp-webhook
supabase functions deploy n8n-workflow-processor
```

### 4. Key Features

#### Agentic AI System
- **5 Specialized AI Agents**: Conversation, Trigger Detection, Content Generation, Campaign, and Analytics agents
- **Autonomous Decision Making**: AI agents operate independently without human intervention
- **Advanced Intent Detection**: Multi-layered analysis with confidence scoring and context awareness
- **Dynamic Content Generation**: Personalized messages created in real-time based on customer data
- **Intelligent Trigger System**: Automatic detection of conversation patterns, behaviors, and opportunities
- **Customer Journey Tracking**: Real-time lifecycle stage management with predictive scoring
- **Lead Scoring**: AI-powered qualification with confidence metrics and factor analysis

#### 1:1 Chat Interface
- Real-time message updates
- See all conversations in one place
- Assign conversations to specific agents
- Message history with timestamps

#### Advanced Automation & Workflows
- **n8n Integration**: Visual workflow builder for complex automation scenarios
- **Intelligent Follow-ups**: AI-powered timing optimization and content personalization
- **Trigger-Based Actions**: Automatic execution based on customer behavior and patterns
- **Multi-Channel Campaigns**: Coordinated messaging across different touchpoints
- **A/B Testing**: Automatic message variation testing and optimization
- **External Integrations**: Connect to CRMs, email marketing, social media, and more

#### Business Card Processing
When customers send images to WhatsApp:
1. Image is stored in `business_card_uploads`
2. Call the OCR edge function with extracted text:
```
POST https://iclfujxgvdjqyjsmwumd.supabase.co/functions/v1/process-business-card
{
  "uploadId": "uuid-here",
  "imageText": "extracted text from OCR"
}
```
3. Contact is automatically created/updated

#### Campaign Management
- Schedule bulk messages for festivals, offers, etc.
- Target specific tags (vip, lead, customer)
- Personalization with placeholders
- Track delivery status

#### Contact Management
- Search and filter contacts
- Add tags for segmentation
- Track source (chat, business_card, manual)
- Edit contact details

### 5. Using the Enhanced Dashboard

#### Login
1. Navigate to your application
2. Enter your admin email and password
3. Access the full Agentic AI CRM dashboard

#### Navigation
- **Agentic AI** - Monitor AI agents, metrics, and performance
- **Conversations** - View and respond to customer chats with AI assistance
- **Contacts** - Manage your contact database with AI-powered insights
- **Campaigns** - Create and schedule AI-optimized campaigns
- **Triggers** - Configure intelligent automation triggers
- **Workflows** - Manage n8n workflow integrations
- **Follow-ups** - Configure advanced automation rules

#### Agentic AI Dashboard Features
- **Real-time AI Metrics**: Monitor automation rates, response times, and satisfaction scores
- **Agent Performance**: Track individual AI agent performance and resource usage
- **Trigger Analytics**: View most effective triggers and success rates
- **Workflow Monitoring**: Monitor n8n workflow executions and performance
- **Customer Journey Insights**: Visualize customer progression through lifecycle stages

### 6. n8n Workflow Integration

#### Setting Up n8n
1. **Install n8n**: Deploy n8n on your server or use n8n Cloud
2. **Generate API Key**: Create an API key in your n8n settings
3. **Configure Connection**: Enter your n8n URL and API key in the Workflows tab
4. **Deploy Templates**: Use pre-built workflow templates for common scenarios

#### Available Workflow Templates
- **Lead Nurturing Sequence**: Automatically nurture leads based on engagement
- **Abandoned Cart Recovery**: Re-engage customers who showed interest but didn't purchase
- **Customer Lifecycle Management**: Manage journey from onboarding to retention
- **Automated Feedback Collection**: Collect customer feedback at optimal times
- **Social Media Integration**: Sync interactions across social platforms
- **CRM Data Synchronization**: Keep data in sync with external CRM systems

#### Creating Custom Workflows
1. Design workflows in n8n with WhatsApp CRM triggers
2. Use webhook nodes to connect with your CRM system
3. Implement conditional logic based on customer data
4. Set up automated actions and notifications

### 7. Customizing AI Intents

Add new intents in Supabase:
```sql
INSERT INTO ai_intents (intent_name, keywords, response_template, confidence_threshold)
VALUES (
  'pricing_inquiry',
  ARRAY['price', 'cost', 'how much', 'pricing'],
  'Thanks for your interest! Our pricing starts at $99/month. Would you like a detailed quote?',
  0.7
);
```

### 8. Advanced Configuration

#### Trigger Management
Create intelligent triggers in the Triggers tab:

```sql
-- Example: High-value customer detection trigger
INSERT INTO triggers (name, type, conditions, actions) VALUES (
  'High-Value Customer Detection',
  'behavior',
  '{"message_frequency": ">5", "engagement_score": ">0.8", "purchase_intent": ">0.7"}',
  '{"update_tags": ["high_value"], "assign_priority_agent": true, "create_workflow": {"name": "vip_onboarding"}}'
);
```

#### Content Template Management
AI agents use dynamic content templates:

```sql
-- Example: Personalized re-engagement template
INSERT INTO content_templates (name, category, template, variables) VALUES (
  'Smart Re-engagement',
  'retention',
  'Hi {{name}}! I noticed you were interested in {{last_product}}. We have a special {{discount}}% offer just for you! 🎉',
  '{"name": "string", "last_product": "string", "discount": "number"}'
);
```

#### Customer Journey Configuration
Set up automated journey stage progression:

```sql
-- Update customer journey stage
SELECT update_customer_journey_stage('customer-uuid', 'consideration', 85);
```

### 9. Security Notes
- All tables have Row Level Security (RLS) enabled
- Only authenticated agents can access data
- WhatsApp webhook is public (for incoming messages)
- Business card processor requires authentication

### 10. Next Steps
- **Configure AI Agents**: Get your FREE Gemini API key and customize system prompts for each AI agent
- **Set Up n8n Workflows**: Deploy workflow templates and create custom automation
- **Create Intelligent Triggers**: Configure triggers for your specific business scenarios
- **Optimize Content Templates**: Create and test message variations for better engagement
- **Monitor Performance**: Use the Agentic AI dashboard to track and optimize performance
- **Scale Your Team**: Add team members as agents with appropriate permissions
- **Integrate External Systems**: Connect your existing CRM, email marketing, and other tools

## Support & Maintenance

### Adding New Agents
```sql
-- First create the user in Supabase Auth, then:
INSERT INTO agents (id, email, full_name, role, is_active)
VALUES (
  'user-uuid-from-auth',
  'agent@company.com',
  'Agent Name',
  'agent',
  true
);
```

### Monitoring
- Check `conversations` table for active chats
- Review `follow_up_queue` for scheduled messages
- Monitor `campaigns` for campaign status
- Check `business_card_uploads` for processing status

### Database Queries

View unassigned conversations:
```sql
SELECT c.*, con.name, con.phone_number
FROM conversations c
JOIN contacts con ON c.contact_id = con.id
WHERE c.assigned_agent_id IS NULL
ORDER BY c.last_message_at DESC;
```

View pending follow-ups:
```sql
SELECT fq.*, c.*, con.name
FROM follow_up_queue fq
JOIN conversations c ON fq.conversation_id = c.id
JOIN contacts con ON c.contact_id = con.id
WHERE fq.status = 'pending'
ORDER BY fq.scheduled_at;
```

## Architecture

### Edge Functions
1. **whatsapp-webhook** - Receives WhatsApp messages, processes with AI, stores in database
2. **process-business-card** - Extracts contact info from business card images

### Real-time Features
- Conversations update in real-time
- New messages appear instantly
- Agent assignments sync across sessions

### Database Design
- Normalized schema with proper foreign keys
- Indexes on frequently queried columns
- JSONB for flexible metadata storage
- Array types for tags and targeting

## Troubleshooting

### Can't log in?
- Verify user exists in Supabase Auth
- Check agent record exists with matching UUID
- Ensure agent is marked as `is_active = true`

### Messages not appearing?
- Check real-time subscription in browser console
- Verify conversation_id is correct
- Check RLS policies allow access

### Follow-ups not sending?
- Implement a cron job to process `follow_up_queue`
- Check rule `is_active = true`
- Verify `scheduled_at` timestamp is in the past

### Campaign not working?
- Check `target_tags` match contact tags
- Verify `scheduled_at` is set correctly
- Implement campaign processor to send messages

---

Your WhatsApp CRM is now ready to use!
