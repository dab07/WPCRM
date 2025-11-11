# Migration from Vite to Next.js

## Overview

This project has been migrated from Vite to Next.js 14 with TypeScript and Tailwind CSS.

## Key Changes

### 1. Project Structure

**Before (Vite):**
```
src/
├── components/
├── lib/
├── App.tsx
├── main.tsx
└── index.css
```

**After (Next.js):**
```
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
└── styles/
    └── globals.css
```

### 2. Environment Variables

- Changed from `VITE_*` prefix to `NEXT_PUBLIC_*` prefix
- Moved from `.env` to `.env.local`
- Updated in `src/lib/supabase.ts`

**Before:**
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**After:**
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. Configuration Files

- `vite.config.ts` → `next.config.js`
- `tsconfig.app.json` → `tsconfig.next.json`
- Updated `tailwind.config.js` for Next.js paths
- Updated `postcss.config.js` to use CommonJS
- Created `.eslintrc.json` for Next.js ESLint

### 4. Scripts

**Before:**
```json
"dev": "vite"
"build": "vite build"
"preview": "vite preview"
```

**After:**
```json
"dev": "next dev"
"build": "next build"
"start": "next start"
```

### 5. Component Changes

All components remain the same, but:
- Root page is now `src/app/page.tsx` (client component)
- Layout is in `src/app/layout.tsx`
- Components use `@/` path alias for imports

## Migration Steps

### 1. Install Dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

### 2. Clean Up Old Files (Optional)

You can remove these Vite-specific files:
- `index.html`
- `vite.config.ts`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `eslint.config.js`

### 3. Update Environment Variables

Copy your environment variables to `.env.local`:
```bash
cp .env .env.local
```

Then update the variable names from `VITE_*` to `NEXT_PUBLIC_*`.

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Component Migration Notes

### Client Components

All interactive components need the `'use client'` directive at the top:
```tsx
'use client';

import { useState } from 'react';
// ... rest of component
```

Components that already use client-side features:
- Dashboard.tsx
- ChatWindow.tsx
- ConversationList.tsx
- ContactsPanel.tsx
- CampaignsPanel.tsx
- FollowUpRulesPanel.tsx
- TriggerManagement.tsx
- N8nIntegration.tsx
- AgenticDashboard.tsx

### Server Components

If you want to create server components in the future, simply omit the `'use client'` directive. Server components can:
- Fetch data directly
- Access environment variables without `NEXT_PUBLIC_` prefix
- Reduce client-side JavaScript bundle

## Benefits of Next.js

1. **Better Performance**: Automatic code splitting and optimization
2. **SEO Ready**: Server-side rendering capabilities
3. **API Routes**: Built-in API endpoints (if needed)
4. **Image Optimization**: Next.js Image component
5. **File-based Routing**: Intuitive routing system
6. **Production Ready**: Optimized builds out of the box

## Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel
```

### Other Platforms
```bash
npm run build
npm start
```

## Troubleshooting

### Module Resolution Issues
If you see import errors, ensure `tsconfig.next.json` has:
```json
"paths": {
  "@/*": ["./src/*"]
}
```

### Environment Variables Not Working
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Restart dev server after changing `.env.local`

### Build Errors
- Run `npm run typecheck` to check for TypeScript errors
- Run `npm run lint` to check for ESLint issues

## Next Steps

1. Consider adding API routes in `src/app/api/` for backend logic
2. Optimize images using Next.js Image component
3. Add metadata for better SEO
4. Consider implementing server-side data fetching where appropriate
