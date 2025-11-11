# MongoDB Architecture for Agentic AI WhatsApp CRM

## Why MongoDB?

### Advantages Over PostgreSQL/Supabase
- **FREE Forever**: MongoDB Atlas free tier (512MB)
- **Flexible Schema**: Perfect for evolving AI data structures
- **JSON-Native**: Natural fit for AI responses and metadata
- **Fast Queries**: Optimized for real-time chat applications
- **Easy Scaling**: Horizontal scaling built-in
- **No Migrations**: Schema-less design means no complex migrations

## Database Collections

### Core Collections

#### 1. `agents`
```javascript
{
  _id: ObjectId,
  email: String,
  full_name: String,
  role: "admin" | "agent",
  password_hash: String,
  is_active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

#### 2. `contacts`
```javascript
{
  _id: ObjectId,
  phone_number: String, // indexed, unique
  name: String,
  email: String,
  company: String,
  tags: [String],
  source: "chat" | "manual" | "business_card",
  metadata: Object, // flexible JSON
  created_at: Date,
  updated_at: Date
}
```

#### 3. `conversations`
```javascript
{
  _id: ObjectId,
  contact_id: ObjectId, // ref: contacts
  assigned_agent_id: ObjectId, // ref: agents
  status: "active" | "ai_handled" | "agent_assigned" | "closed",
  last_message_at: Date,
  last_message_from: "customer" | "agent" | "ai",
  ai_confidence_score: Number,
  handover_reason: String,
  context: Object, // AI conversation context
  created_at: Date,
  updated_at: Date
}
```

#### 4. `messages`
```javascript
{
  _id: ObjectId,
  conversation_id: ObjectId, // ref: conversations
  sender_type: "customer" | "agent" | "ai",
  sender_id: ObjectId, // ref: agents (if agent/ai)
  content: String,
  message_type: "text" | "image" | "document",
  media_url: String,
  whatsapp_message_id: String,
  delivery_status: "sent" | "delivered" | "read" | "failed",
  created_at: Date
}
```

### AI Collections

#### 5. `ai_agents`
```javascript
{
  _id: ObjectId,
  name: String,
  type: "conversation" | "trigger" | "content" | "campaign" | "analytics",
  model_config: {
    model: "gemini-1.5-flash",
    temperature: Number,
    max_tokens: Number
  },
  system_prompt: String,
  is_active: Boolean,
  performance_metrics: {
    total_requests: Number,
    success_rate: Number,
    avg_response_time: Number
  },
  created_at: Date,
  updated_at: Date
}
```

#### 6. `triggers`
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  type: "conversation_pattern" | "time_based" | "behavior" | "lifecycle",
  conditions: Object, // flexible JSON conditions
  actions: Object, // flexible JSON actions
  priority: Number,
  is_active: Boolean,
  success_rate: Number,
  execution_count: Number,
  created_by: ObjectId, // ref: agents
  created_at: Date,
  updated_at: Date
}
```

#### 7. `customer_journey`
```javascript
{
  _id: ObjectId,
  contact_id: ObjectId, // ref: contacts, unique
  stage: "awareness" | "interest" | "consideration" | "purchase" | "retention",
  score: Number,
  touchpoints: [
    {
      type: String,
      timestamp: Date,
      data: Object
    }
  ],
  next_action: String,
  predicted_value: Number,
  churn_risk: Number,
  engagement_level: "low" | "medium" | "high",
  last_interaction: Date,
  updated_at: Date
}
```

#### 8. `content_templates`
```javascript
{
  _id: ObjectId,
  name: String,
  category: String,
  template: String,
  variables: Object,
  performance_metrics: {
    usage_count: Number,
    success_rate: Number,
    avg_response_rate: Number
  },
  is_active: Boolean,
  created_by: ObjectId, // ref: agents
  created_at: Date,
  updated_at: Date
}
```

#### 9. `workflow_executions`
```javascript
{
  _id: ObjectId,
  workflow_id: String,
  workflow_name: String,
  contact_id: ObjectId, // ref: contacts
  conversation_id: ObjectId, // ref: conversations
  trigger_data: Object,
  status: "running" | "completed" | "failed" | "cancelled",
  result: Object,
  error_message: String,
  execution_time_ms: Number,
  started_at: Date,
  completed_at: Date
}
```

#### 10. `campaigns`
```javascript
{
  _id: ObjectId,
  name: String,
  message_template: String,
  target_tags: [String],
  target_contact_ids: [ObjectId],
  scheduled_at: Date,
  status: "draft" | "scheduled" | "running" | "completed" | "cancelled",
  total_recipients: Number,
  sent_count: Number,
  delivered_count: Number,
  read_count: Number,
  response_count: Number,
  created_by: ObjectId, // ref: agents
  created_at: Date,
  completed_at: Date
}
```

#### 11. `conversation_analytics`
```javascript
{
  _id: ObjectId,
  conversation_id: ObjectId, // ref: conversations
  sentiment_score: Number,
  intent_detected: [String],
  topics_discussed: [String],
  customer_satisfaction: Number,
  resolution_status: String,
  escalation_reason: String,
  insights: Object,
  analyzed_at: Date
}
```

#### 12. `lead_scoring`
```javascript
{
  _id: ObjectId,
  contact_id: ObjectId, // ref: contacts, unique
  score: Number,
  factors: {
    engagement: Number,
    recency: Number,
    frequency: Number,
    intent: Number
  },
  confidence: Number,
  last_updated: Date
}
```

## Indexes for Performance

```javascript
// contacts
db.contacts.createIndex({ phone_number: 1 }, { unique: true });
db.contacts.createIndex({ tags: 1 });
db.contacts.createIndex({ created_at: -1 });

// conversations
db.conversations.createIndex({ contact_id: 1 });
db.conversations.createIndex({ assigned_agent_id: 1 });
db.conversations.createIndex({ status: 1 });
db.conversations.createIndex({ last_message_at: -1 });

// messages
db.messages.createIndex({ conversation_id: 1, created_at: -1 });
db.messages.createIndex({ whatsapp_message_id: 1 }, { unique: true, sparse: true });

// triggers
db.triggers.createIndex({ type: 1, is_active: 1 });

// customer_journey
db.customer_journey.createIndex({ contact_id: 1 }, { unique: true });
db.customer_journey.createIndex({ stage: 1 });

// workflow_executions
db.workflow_executions.createIndex({ contact_id: 1 });
db.workflow_executions.createIndex({ status: 1 });
db.workflow_executions.createIndex({ started_at: -1 });

// lead_scoring
db.lead_scoring.createIndex({ contact_id: 1 }, { unique: true });
db.lead_scoring.createIndex({ score: -1 });
```

## Connection Setup

### Environment Variables
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-crm?retryWrites=true&w=majority
MONGODB_DB_NAME=whatsapp-crm
```

### Connection Code
```javascript
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
let db;

export async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.MONGODB_DB_NAME);
  }
  return db;
}

export function getDB() {
  if (!db) {
    throw new Error('Database not connected');
  }
  return db;
}
```

## Advantages for AI System

### 1. Flexible Schema
- Store dynamic AI responses without schema changes
- Add new fields as AI capabilities evolve
- Store complex nested data structures

### 2. Fast Queries
- Optimized for real-time chat applications
- Efficient indexing for conversation lookups
- Fast aggregation for analytics

### 3. Scalability
- Horizontal scaling with sharding
- Replica sets for high availability
- Automatic failover

### 4. Cost-Effective
- FREE Atlas tier (512MB)
- Pay-as-you-grow pricing
- No infrastructure management

## Migration from Supabase

If you have existing Supabase data:
1. Export data from Supabase
2. Transform to MongoDB format
3. Import using mongoimport or custom scripts
4. Update application code to use MongoDB

## Best Practices

### 1. Use Transactions
```javascript
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    await db.collection('contacts').insertOne(contact, { session });
    await db.collection('conversations').insertOne(conversation, { session });
  });
} finally {
  await session.endSession();
}
```

### 2. Implement Caching
```javascript
// Cache frequently accessed data
const cache = new Map();

async function getContact(id) {
  if (cache.has(id)) {
    return cache.get(id);
  }
  const contact = await db.collection('contacts').findOne({ _id: id });
  cache.set(id, contact);
  return contact;
}
```

### 3. Use Aggregation Pipeline
```javascript
// Get conversation analytics
const analytics = await db.collection('messages').aggregate([
  { $match: { conversation_id: conversationId } },
  { $group: {
    _id: '$sender_type',
    count: { $sum: 1 },
    avgLength: { $avg: { $strLenCP: '$content' } }
  }}
]).toArray();
```

## Security

### 1. Authentication
- Use MongoDB Atlas built-in authentication
- Implement JWT tokens for API access
- Role-based access control

### 2. Data Encryption
- Enable encryption at rest (Atlas)
- Use TLS/SSL for connections
- Encrypt sensitive fields

### 3. Network Security
- Whitelist IP addresses
- Use VPC peering for production
- Enable audit logging

---

**MongoDB provides a perfect foundation for our agentic AI WhatsApp CRM with flexibility, performance, and cost-effectiveness!**