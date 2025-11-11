# Technology Stack

## Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4.2
- **Styling**: Tailwind CSS 3.4.1 with PostCSS
- **Icons**: Lucide React
- **State Management**: React Context API (AuthContext)
- **Charts**: Recharts for analytics visualization
- **Date Handling**: date-fns for date manipulation

## Backend

- **Database**: MongoDB Atlas (FREE tier - 512MB)
- **API Server**: Express.js with REST API
- **AI Engine**: Google Gemini API (FREE tier)
- **Workflow Automation**: n8n integration
- **Real-time Updates**: Polling-based (can be upgraded to WebSocket)

## Development Tools

- **Linting**: ESLint 9 with TypeScript ESLint
- **Type Checking**: TypeScript 5.5.3
- **Package Manager**: npm

## Common Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint
npm run typecheck       # Run TypeScript type checking

# Supabase (if CLI installed)
supabase start          # Start local Supabase
supabase db reset       # Reset local database
supabase functions serve # Serve edge functions locally
```

## Environment Variables

Required environment variables in `.env`:
- `MONGODB_URI`: MongoDB Atlas connection string
- `MONGODB_DB_NAME`: Database name (e.g., whatsapp_crm)
- `GEMINI_API_KEY`: Google Gemini API key (FREE)
- `VITE_API_BASE_URL`: Frontend API base URL (e.g., http://localhost:3000/api)
- `N8N_BASE_URL`: n8n instance URL (optional)
- `N8N_API_KEY`: n8n API key (optional)
- `WHATSAPP_VERIFY_TOKEN`: WhatsApp webhook verification token
- `WHATSAPP_ACCESS_TOKEN`: WhatsApp API access token
- `WHATSAPP_PHONE_NUMBER_ID`: WhatsApp phone number ID

## Database Schema

- Uses MongoDB with flexible document structure
- Collections: contacts, conversations, messages, campaigns, triggers, follow_up_rules
- Embedded documents for flexible metadata storage
- Array fields for tags and targeting
- Proper indexing for performance optimization
- No authentication system - direct access to agentic AI features