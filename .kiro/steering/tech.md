# Technology Stack

## Frontend

- **Framework**: Next.js 14 with React 18 and TypeScript
- **Rendering**: App Router with Client Components
- **Styling**: Tailwind CSS 3.4.1 with PostCSS
- **Icons**: Lucide React
- **State Management**: React Context API (AuthContext)
- **Charts**: Recharts for analytics visualization
- **Date Handling**: date-fns for date manipulation

## Backend

- **Database**: Supabase (PostgreSQL) - FREE tier
- **API**: Supabase Auto-generated REST API
- **Real-time**: Supabase Realtime subscriptions
- **AI Engine**: Google Gemini API (FREE tier)
- **Workflow Automation**: n8n integration

## Development Tools

- **Linting**: ESLint with Next.js config
- **Type Checking**: TypeScript 5.5.3
- **Package Manager**: npm

## Common Commands

```bash
# Development
npm run dev              # Start Next.js development server (port 3000)
npm run build           # Build for production
npm start               # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run typecheck       # Run TypeScript type checking

# Supabase (if CLI installed)
supabase start          # Start local Supabase
supabase db reset       # Reset local database
supabase functions serve # Serve edge functions locally
```

## Environment Variables

Required environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `NEXT_PUBLIC_GEMINI_API_KEY`: Google Gemini API key (FREE)
- `N8N_BASE_URL`: n8n instance URL (optional)
- `N8N_API_KEY`: n8n API key (optional)
- `WHATSAPP_VERIFY_TOKEN`: WhatsApp webhook verification token
- `WHATSAPP_ACCESS_TOKEN`: WhatsApp API access token
- `WHATSAPP_PHONE_NUMBER_ID`: WhatsApp phone number ID

**Note**: Client-side environment variables must be prefixed with `NEXT_PUBLIC_`

## Database Schema

- Uses Supabase (PostgreSQL) with structured tables
- Tables: contacts, conversations, messages, campaigns, triggers, follow_up_rules, workflow_executions, ai_intents
- JSONB fields for flexible metadata storage
- Array fields for tags and targeting
- Proper indexing for performance optimization
- Row Level Security (RLS) disabled for direct access to agentic AI features