# Project Structure

## Directory Layout

```
/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page (renders Dashboard)
│   └── components/             # React components (all client-side)
│       ├── Dashboard.tsx       # Main dashboard with tab navigation
│       ├── AgenticDashboard.tsx
│       ├── ConversationList.tsx
│       ├── ChatWindow.tsx
│       ├── ContactsPanel.tsx
│       ├── CampaignsPanel.tsx
│       ├── FollowUpRulesPanel.tsx
│       ├── TriggerManagement.tsx
│       └── N8nIntegration.tsx
├── supabase/
│   ├── migrations/             # Database schema migrations
│   │   └── 20241111000001_initial_schema.sql
│   ├── seed.sql                # Seed data
│   ├── config.toml             # Supabase config
│   └── supabase.ts             # Supabase client setup
├── n8n-workflows/              # N8N workflow definitions (JSON)
├── .env                        # Environment variables
├── globals.css                 # Global Tailwind styles
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind configuration
├── tsconfig.json               # TypeScript config (references)
├── tsconfig.next.json          # Next.js TypeScript config
└── package.json                # Dependencies and scripts
```

## Architecture Patterns

### Component Organization

- All components use `'use client'` directive (client-side rendering)
- Components are flat in `/src/components/` (no nested folders)
- Dashboard.tsx is the main orchestrator with tab-based navigation
- Each panel component is self-contained and manages its own state

### Data Layer

- **Missing**: No `/src/lib/api.ts` or data layer abstraction yet
- Components import types from `'../lib/api'` but file doesn't exist
- Direct Supabase client usage expected in components
- Database schema defined in SQL migrations, not TypeScript

### Type Definitions

- Types referenced: `Contact`, `Conversation`, `Message`, `Campaign`, etc.
- Currently imported from non-existent `../lib/api`
- Should match Supabase schema in `supabase/migrations/`

### State Management

- Local component state with `useState`
- No global state management (Redux, Zustand, etc.)
- Props drilling for shared state (e.g., selectedConversation)

## Database Schema

Key tables (see `supabase/migrations/20241111000001_initial_schema.sql`):

- `contacts`: Customer records with JSONB metadata
- `conversations`: Chat threads with AI confidence scoring
- `messages`: Individual messages with delivery status
- `campaigns`: Bulk messaging campaigns
- `follow_up_rules`: Automated follow-up configuration
- `triggers`: Event-based automation rules
- `workflow_executions`: N8N workflow run logs
- `ai_intents`: Intent recognition configuration

All tables use UUID primary keys and include `created_at` timestamps.

## Naming Conventions

- **Files**: PascalCase for components (`Dashboard.tsx`)
- **Components**: PascalCase function names
- **Variables**: camelCase
- **Types**: PascalCase interfaces/types
- **Database**: snake_case for tables and columns
- **CSS**: Tailwind utility classes (no custom CSS modules)

## Missing Pieces

- `/src/lib/api.ts`: Type definitions and API client
- `/src/lib/supabase.ts`: Supabase client initialization
- API route handlers (if needed for server-side operations)
- WhatsApp Business API integration layer
