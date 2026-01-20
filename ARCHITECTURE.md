# Festival Campaigns - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐      ┌──────────────────────┐         │
│  │ FestivalCampaignForm │      │FestivalCampaignsList │         │
│  │  - Create campaigns  │      │  - View campaigns    │         │
│  │  - Preview images    │      │  - Execute campaigns │         │
│  │  - Schedule delivery │      │  - Monitor status    │         │
│  └──────────────────────┘      └──────────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/campaigns/festival                                 │   │
│  │  - POST: Create festival campaign                        │   │
│  │  - GET: List festival campaigns                          │   │
│  │  - POST ?preview_image: Preview image                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/campaigns/orchestrator                             │   │
│  │  - POST: Execute campaign                                │   │
│  │  - GET: List all campaigns                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           CampaignOrchestrator                           │   │
│  │  - Create campaigns                                      │   │
│  │  - Execute campaigns                                     │   │
│  │  - Manage campaign lifecycle                             │   │
│  │  - Coordinate image generation                           │   │
│  │  - Coordinate message sending                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                    ↓                    ↓                        │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │ FestivalImageService     │  │  WhatsAppService         │    │
│  │ - Generate SVG images    │  │  - Send text messages    │    │
│  │ - Festival themes        │  │  - Send image messages   │    │
│  │ - Logo integration       │  │  - Rate limiting         │    │
│  │ - Error handling         │  │  - Error handling        │    │
│  └──────────────────────────┘  └──────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           GeminiService (for AI features)                │   │
│  │  - Message personalization                               │   │
│  │  - Intent detection                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Supabase PostgreSQL                         │   │
│  │                                                          │   │
│  │  ┌────────────────┐  ┌────────────────┐                │   │
│  │  │   campaigns    │  │   messages     │                │   │
│  │  │ - id           │  │ - id           │                │   │
│  │  │ - name         │  │ - conversation │                │   │
│  │  │ - festival_type│  │ - content      │                │   │
│  │  │ - greeting_text│  │ - message_type │                │   │
│  │  │ - include_image│  │ - delivery_stat│                │   │
│  │  │ - image_theme  │  │ - metadata     │                │   │
│  │  │ - status       │  │ - created_at   │                │   │
│  │  │ - sent_count   │  └────────────────┘                │   │
│  │  │ - created_at   │                                    │   │
│  │  └────────────────┘  ┌────────────────┐                │   │
│  │                      │   contacts     │                │   │
│  │  ┌────────────────┐  │ - id           │                │   │
│  │  │ conversations  │  │ - phone_number │                │   │
│  │  │ - id           │  │ - name         │                │   │
│  │  │ - contact_id   │  │ - tags         │                │   │
│  │  │ - status       │  │ - metadata     │                │   │
│  │  │ - created_at   │  └────────────────┘                │   │
│  │  └────────────────┘                                    │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐      ┌──────────────────────┐         │
│  │  WhatsApp Business   │      │   Gemini AI API      │         │
│  │  - Send messages     │      │  - Generate text     │         │
│  │  - Delivery tracking │      │  - Analyze sentiment │         │
│  └──────────────────────┘      └──────────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Campaign Creation Flow

```
User Input (UI)
    ↓
FestivalCampaignForm
    ↓
POST /api/campaigns/festival
    ↓
CampaignOrchestrator.createCampaign()
    ↓
Supabase (campaigns table)
    ↓
Response to UI
    ↓
FestivalCampaignsList (updated)
```

### Campaign Execution Flow

```
Scheduled Time / Manual Trigger
    ↓
CampaignOrchestrator.executeCampaign()
    ↓
Get Eligible Contacts (by tags)
    ↓
For Each Contact (batch of 10):
    ├─ Personalize Message
    │   └─ GeminiService (optional AI enhancement)
    ├─ Generate Festival Image
    │   └─ FestivalImageService.generateFestivalImageSVG()
    ├─ Send WhatsApp Message
    │   └─ WhatsAppService.sendMessage()
    └─ Log Message
        └─ Supabase (messages table)
    ↓
Update Campaign Status
    └─ Supabase (campaigns table)
```

### Image Generation Flow

```
FestivalImageService.generateFestivalImageSVG()
    ↓
Get Festival Details (colors, elements, style)
    ↓
Load Zavops Logo (if available)
    ↓
Create SVG Template
    ├─ Background Gradient (festival colors)
    ├─ Decorative Elements (circles, shapes)
    ├─ Main Greeting Text (large, bold)
    ├─ Campaign Name (subtitle)
    └─ Zavops Logo (top-right corner)
    ↓
Convert SVG to Base64
    ↓
Return Image Data
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                    FestivalCampaignForm                      │
│  - Manages form state                                        │
│  - Handles user input                                        │
│  - Calls API endpoints                                       │
│  - Shows preview images                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    API Endpoints
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   CampaignOrchestrator                        │
│  - Orchestrates campaign lifecycle                           │
│  - Coordinates services                                      │
│  - Manages database operations                               │
└─────────────────────────────────────────────────────────────┘
                    ↙              ↘
        ┌──────────────────┐  ┌──────────────────┐
        │FestivalImageServ │  │ WhatsAppService  │
        │- Generate images │  │ - Send messages  │
        └──────────────────┘  └──────────────────┘
                    ↓              ↓
        ┌──────────────────┐  ┌──────────────────┐
        │  SVG Images      │  │ WhatsApp API     │
        └──────────────────┘  └──────────────────┘
```

## Database Schema

```
campaigns
├── id (UUID, PK)
├── name (TEXT)
├── message_template (TEXT)
├── target_tags (TEXT[])
├── status (TEXT) - draft, scheduled, running, completed, paused
├── scheduled_at (TIMESTAMPTZ)
├── sent_count (INTEGER)
├── delivered_count (INTEGER)
├── read_count (INTEGER)
├── festival_type (TEXT) ✨ NEW
├── greeting_text (TEXT) ✨ NEW
├── include_image (BOOLEAN) ✨ NEW
├── image_theme (TEXT) ✨ NEW
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

messages
├── id (UUID, PK)
├── conversation_id (UUID, FK)
├── whatsapp_message_id (TEXT)
├── sender_type (TEXT)
├── content (TEXT)
├── message_type (TEXT) - text, image, document, audio, video
├── media_url (TEXT)
├── delivery_status (TEXT)
├── ai_intent (TEXT)
├── ai_confidence (DECIMAL)
├── metadata (JSONB)
│   ├── campaign_id (UUID)
│   ├── campaign_name (TEXT)
│   ├── contact_id (UUID)
│   ├── festival_type (TEXT) ✨ NEW
│   └── has_image (BOOLEAN) ✨ NEW
└── created_at (TIMESTAMPTZ)

contacts
├── id (UUID, PK)
├── phone_number (TEXT, UNIQUE)
├── name (TEXT)
├── email (TEXT)
├── company (TEXT)
├── tags (TEXT[])
├── metadata (JSONB)
├── source (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

conversations
├── id (UUID, PK)
├── contact_id (UUID, FK)
├── status (TEXT)
├── assigned_agent_id (TEXT)
├── ai_confidence_score (DECIMAL)
├── last_message_at (TIMESTAMPTZ)
├── last_message_from (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

## Service Dependencies

```
FestivalImageService
├── GoogleGenAI (Gemini API)
├── fs (File system - for logo loading)
└── path (Path utilities)

CampaignOrchestrator
├── GeminiService
├── WhatsAppService
├── FestivalImageService ✨ NEW
└── Supabase Admin Client

WhatsAppService
├── Meta Cloud API
└── Fetch API

GeminiService
├── GoogleGenAI
└── Fetch API
```

## Error Handling Flow

```
API Request
    ↓
Try-Catch Block
    ├─ Success
    │   └─ Return 200 with data
    └─ Error
        ├─ Log error
        ├─ Determine error type
        ├─ Return appropriate status code
        │   ├─ 400 - Bad request
        │   ├─ 401 - Unauthorized
        │   ├─ 404 - Not found
        │   ├─ 500 - Server error
        │   └─ 503 - Service unavailable
        └─ Return error message
```

## Scaling Considerations

### Horizontal Scaling
- Stateless API endpoints (can run on multiple servers)
- Database connection pooling
- Load balancing for API requests

### Vertical Scaling
- Batch processing (10 contacts per batch)
- Rate limiting (200ms between messages)
- Memory-efficient image generation (SVG)

### Database Optimization
- Indexed queries on festival_type, status, created_at
- Partitioning by date for large message tables
- Archive old campaigns to separate storage

## Security Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. API Authentication
│     - Verify request origin
│     - Validate API keys
│     - Rate limiting
│                                                               │
│  2. Data Validation
│     - Input sanitization
│     - Type checking
│     - Length validation
│                                                               │
│  3. Database Security
│     - Row-level security (RLS)
│     - Encrypted credentials
│     - Audit logging
│                                                               │
│  4. External API Security
│     - Encrypted credentials
│     - HTTPS only
│     - API key rotation
│                                                               │
│  5. Message Security
│     - WhatsApp end-to-end encryption
│     - Secure token storage
│     - No sensitive data in logs
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│                Performance Strategies                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Batch Processing
│     - Process 10 contacts per batch
│     - Parallel processing within batch
│     - Sequential batches (rate limiting)
│                                                               │
│  2. Caching
│     - Cache festival details
│     - Cache SVG templates
│     - Cache logo data
│                                                               │
│  3. Database Optimization
│     - Indexed queries
│     - Connection pooling
│     - Query optimization
│                                                               │
│  4. Image Generation
│     - SVG (fast, lightweight)
│     - Base64 encoding (no file I/O)
│     - Reuse templates
│                                                               │
│  5. API Optimization
│     - Response compression
│     - Pagination for lists
│     - Lazy loading
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Load Balancer                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                    ↓                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Next.js Application Servers                 │   │
│  │  (Multiple instances for high availability)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                    ↓                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Supabase PostgreSQL Database                │   │
│  │  (Managed, with automatic backups)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                    ↓                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         External Services                           │   │
│  │  - WhatsApp Business API                            │   │
│  │  - Gemini AI API                                    │   │
│  │  - Monitoring & Logging                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Stack                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Application Metrics
│     - Campaign execution time
│     - Message send rate
│     - Error rate
│     - API response time
│                                                               │
│  2. Business Metrics
│     - Campaigns created
│     - Messages sent
│     - Delivery rate
│     - Engagement rate
│                                                               │
│  3. Infrastructure Metrics
│     - CPU usage
│     - Memory usage
│     - Database connections
│     - API rate limits
│                                                               │
│  4. Logging
│     - Application logs
│     - API logs
│     - Error logs
│     - Audit logs
│                                                               │
│  5. Alerting
│     - High error rate
│     - Slow response time
│     - Database issues
│     - API failures
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

**Version**: 1.0  
**Last Updated**: January 20, 2025
