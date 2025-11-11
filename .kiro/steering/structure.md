# Project Structure

## Root Directory

```
├── src/                    # Frontend source code
├── supabase/              # Backend database and functions
├── .kiro/                 # Kiro configuration and steering
├── package.json           # Dependencies and scripts
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.next.json     # TypeScript configuration
└── MIGRATION_GUIDE.md     # Vite to Next.js migration guide
```

## Frontend Structure (`src/`)

```
src/
├── app/                   # Next.js App Router
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Home page (Dashboard)
├── components/            # React components
│   ├── Dashboard.tsx      # Main dashboard layout
│   ├── ConversationList.tsx    # Chat conversation list
│   ├── ChatWindow.tsx     # Individual chat interface
│   ├── ContactsPanel.tsx  # Contact management
│   ├── CampaignsPanel.tsx # Campaign management
│   ├── FollowUpRulesPanel.tsx  # Follow-up automation
│   ├── TriggerManagement.tsx   # Trigger configuration
│   ├── N8nIntegration.tsx      # n8n workflow integration
│   └── AgenticDashboard.tsx    # AI metrics dashboard
├── lib/                   # Utilities and configurations
│   └── supabase.ts        # Supabase client and type definitions
└── styles/                # Global styles
    └── globals.css        # Tailwind CSS imports
```

## Backend Structure (`supabase/`)

```
supabase/
├── migrations/            # Database migrations
│   └── 20241111000001_initial_schema.sql
├── functions/             # Edge functions (optional)
│   └── _shared/           # Shared utilities
├── config.toml            # Supabase configuration
└── seed.sql               # Sample data for development
```

## Component Architecture

- **App Router**: Next.js 14 App Router with client components
- **Dashboard**: Main layout with tab-based navigation (no authentication required)
- **AgenticDashboard**: AI-powered metrics and automation overview
- **Panel Components**: Feature-specific interfaces (contacts, campaigns, triggers, workflows)
- **Chat Components**: Messaging interface with polling-based updates

## Database Tables

Core Supabase tables:
- `contacts` - Customer information with tags
- `conversations` - Chat sessions with status tracking
- `messages` - Individual chat messages
- `campaigns` - Bulk messaging campaigns
- `triggers` - Event-based automation triggers
- `follow_up_rules` - Automation rules
- `workflow_executions` - n8n workflow execution logs
- `ai_intents` - AI response templates

## Naming Conventions

- **Files**: PascalCase for components (`Dashboard.tsx`)
- **Functions**: camelCase (`signIn`, `loadAgent`)
- **Database**: snake_case (`contact_id`, `created_at`)
- **CSS Classes**: Tailwind utility classes
- **Types/Interfaces**: PascalCase matching database entities
- **Path Aliases**: Use `@/` for imports from `src/` directory