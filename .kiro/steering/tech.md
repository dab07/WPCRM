# Tech Stack

## Framework & Runtime

- **Next.js 14.2**: React framework with App Router architecture
- **React 18.3**: UI library with client-side rendering ('use client' directives)
- **TypeScript 5.5**: Strict type checking enabled
- **Node.js 20+**: Runtime environment

## Styling & UI

- **Tailwind CSS 3.4**: Utility-first CSS framework
- **Lucide React**: Icon library for UI components
- **Recharts 2.8**: Charting library for data visualization

## Database & Backend

- **Supabase**: PostgreSQL database with REST API client (@supabase/supabase-js)
- **PostgREST**: Auto-generated REST API from database schema
- **UUID**: Primary key format (not ObjectId or auto-increment)

## External Services

- **N8N**: Self-hosted workflow automation (localhost:5678 in development)
- **Gemini AI**: Google's AI API for natural language processing
- **WhatsApp Business API**: Message delivery (external integration)

## Development Tools

- **ESLint**: Code linting with Next.js config
- **PostCSS**: CSS processing with Autoprefixer
- **TypeScript Compiler**: Type checking via `tsc --noEmit`

## Common Commands

```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npx n8n                  # Start N8N locally (port 5678)

# Build & Production
npm run build            # Build production bundle
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # Type check without emitting files

# Database
# Migrations are in supabase/migrations/
# Run via Supabase CLI or dashboard
```

## Environment Variables

Required in `.env` or `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# AI
GEMINI_API_KEY=AIza...

# N8N
NEXT_PUBLIC_N8N_API_KEY=eyJ...
N8N_API_KEY_AUTH_ENABLED=true
N8N_BASE_URL=http://localhost:5678
```

## Key Dependencies

- `date-fns`: Date formatting and manipulation
- `lucide-react`: Icon components
- `recharts`: Data visualization
- `@supabase/supabase-js`: Supabase client library
