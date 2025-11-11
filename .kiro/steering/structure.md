# Project Structure

## Root Directory

```
├── src/                    # Frontend source code
├── supabase/              # Backend database and functions
├── .kiro/                 # Kiro configuration and steering
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite build configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── SETUP_GUIDE.md         # Comprehensive setup documentation
```

## Frontend Structure (`src/`)

```
src/
├── components/            # React components
│   ├── Dashboard.tsx      # Main dashboard layout
│   ├── LoginForm.tsx      # Authentication form
│   ├── ConversationList.tsx    # Chat conversation list
│   ├── ChatWindow.tsx     # Individual chat interface
│   ├── ContactsPanel.tsx  # Contact management
│   ├── CampaignsPanel.tsx # Campaign management
│   └── FollowUpRulesPanel.tsx  # Follow-up automation
├── lib/                   # Utilities and configurations
│   └── api.ts             # API client and type definitions
├── App.tsx               # Root application component
├── main.tsx              # Application entry point
└── index.css             # Global styles with Tailwind
```

## Backend Structure (`server/`)

```
server/
├── routes/                # API route handlers
│   ├── webhook.js         # WhatsApp webhook processing
│   ├── contacts.js        # Contact management
│   └── ...                # Other API routes
├── services/              # Business logic
│   └── gemini.js          # AI service integration
├── db/                    # Database connection
│   └── mongodb.js         # MongoDB client setup
└── index.js               # Express server entry point
```

## Component Architecture

- **Dashboard**: Main layout with tab-based navigation (no authentication required)
- **AgenticDashboard**: AI-powered metrics and automation overview
- **Panel Components**: Feature-specific interfaces (contacts, campaigns, triggers, workflows)
- **Chat Components**: Messaging interface with polling-based updates

## Database Collections

Core MongoDB collections:
- `contacts` - Customer information with tags
- `conversations` - Chat sessions with status tracking
- `messages` - Individual chat messages
- `campaigns` - Bulk messaging campaigns
- `triggers` - Event-based automation triggers
- `follow_up_rules` - Automation rules
- `workflow_executions` - n8n workflow execution logs

## Naming Conventions

- **Files**: PascalCase for components (`Dashboard.tsx`)
- **Functions**: camelCase (`signIn`, `loadAgent`)
- **Database**: snake_case (`contact_id`, `created_at`)
- **CSS Classes**: Tailwind utility classes
- **Types/Interfaces**: PascalCase matching database entities